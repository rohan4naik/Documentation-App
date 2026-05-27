import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useDocumentsViewModel } from '../viewmodels/useDocumentsViewModel';
import { useSearchViewModel } from '../viewmodels/useSearchViewModel';
import { useWorkspacesViewModel } from '../viewmodels/useWorkspacesViewModel';
import { useAppStore } from '../store/useAppStore';
import { DocumentCard } from '../components/cards/DocumentCard';
import { SearchBar } from '../components/search/SearchBar';
import { Database, HardDrive, UploadCloud, ChevronRight, Repeat, Share2, LogOut } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';

export function DashboardView() {
  const { documents, isLoading, uploadFile, convertFile } = useDocumentsViewModel();
  const { searchResults, searchQuery, isSearching } = useSearchViewModel();
  const insets = useSafeAreaInsets();

  const isSearchActive = searchQuery.length > 0;
  
  const displayDocs = isSearchActive 
    ? documents.filter(d => searchResults.some(r => r.documentId === d.id))
    : [];

  const handleUploadAction = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'pdf') {
          Alert.alert('Error', 'Only PDF files are allowed. Other formats are not allowed.');
          return;
        }
        await uploadFile(file.name, file.uri);
      }
    } catch (e) {
      console.error('Document picking failed', e);
    }
  };

  const handleConvertAction = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      const performConversion = async (targetFormat: string) => {
        try {
          const localUri = await convertFile(file.name, file.uri, targetFormat);
          if (localUri) {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              const fileExt = localUri.split('.').pop()?.toLowerCase();
              let mimeType = 'application/octet-stream';
              if (fileExt === 'pdf') mimeType = 'application/pdf';
              else if (fileExt === 'md') mimeType = 'text/markdown';
              else if (fileExt === 'txt') mimeType = 'text/plain';
              else if (fileExt === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              else if (fileExt === 'jpg' || fileExt === 'jpeg') mimeType = 'image/jpeg';
              else if (fileExt === 'zip') mimeType = 'application/zip';

              await Sharing.shareAsync(localUri, {
                mimeType: mimeType,
                dialogTitle: 'Download Converted Document',
              });
            } else {
              Alert.alert('Success', `File converted successfully and saved to: ${localUri}`);
            }
          } else {
            Alert.alert('Error', 'Failed to convert the document.');
          }
        } catch (err) {
          console.error(err);
          Alert.alert('Error', 'An error occurred during conversion.');
        }
      };

      const buttons: any[] = [];
      if (ext === 'pdf') {
        buttons.push(
          { text: 'Word (.docx)', onPress: () => performConversion('docx') },
          { text: 'Image (.jpg)', onPress: () => performConversion('jpg') }
        );
      } else {
        buttons.push(
          { text: 'PDF (.pdf)', onPress: () => performConversion('pdf') },
          { text: 'Word (.docx)', onPress: () => performConversion('docx') }
        );
      }
      buttons.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert(
        'Convert Document',
        `Choose target format for "${file.name}":`,
        buttons
      );
    } catch (e) {
      console.error('Document selection for conversion failed', e);
    }
  };

  const handleWorkspacesAction = () => {
    router.push('/workspaces');
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
          }
        }
      ]
    );
  };

  const totalDocs = documents.length;
  const storageUsed = (totalDocs * 2.4).toFixed(1); // 2.4 MB per document
  const storagePercent = Math.min((parseFloat(storageUsed) / 100) * 100, 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {!isSearchActive && (
        <View style={styles.header}>
          <Text style={styles.title}>Home</Text>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <LogOut color="#ef4444" size={16} style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      )}

      <View style={{ marginBottom: isSearchActive ? 16 : 28 }}>
        <SearchBar />
      </View>
      
      {!isSearchActive && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.blueCard]}>
            <View style={styles.statHeader}>
              <Database color="#2563eb" size={20} />
              <Text style={[styles.statTitle, styles.blueTitle]}>Total Documents</Text>
            </View>
            <Text style={[styles.statValue, styles.blueValue]}>{totalDocs}</Text>
            <Text style={[styles.statSubtext, styles.blueSubtext]}>Active files</Text>
          </View>
          <View style={[styles.statCard, styles.greenCard]}>
            <View style={styles.statHeader}>
              <HardDrive color="#059669" size={20} />
              <Text style={[styles.statTitle, styles.greenTitle]}>Storage Used</Text>
            </View>
            <Text style={[styles.statValue, styles.greenValue]}>{storageUsed} MB</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarTrack, styles.greenProgressBarTrack]}>
                <View style={[styles.progressBarFill, { width: `${storagePercent}%` }]} />
              </View>
              <Text style={[styles.progressText, styles.greenProgressText]}>{storagePercent.toFixed(1)}% of 100 MB</Text>
            </View>
          </View>
        </View>
      )}

      {!isSearchActive ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested Actions</Text>
          </View>

          <View style={styles.actionsList}>
            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={handleUploadAction}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <UploadCloud color="#3b82f6" size={22} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Upload Document</Text>
                <Text style={styles.actionDesc}>Add new specifications, manuals, or notes</Text>
              </View>
              <ChevronRight color="#475569" size={18} />
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={handleConvertAction}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Repeat color="#10b981" size={22} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Convert Document</Text>
                <Text style={styles.actionDesc}>Format converter (e.g. PDF to Markdown/TXT)</Text>
              </View>
              <ChevronRight color="#475569" size={18} />
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={handleWorkspacesAction}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Share2 color="#8b5cf6" size={22} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Share Workspace</Text>
                <Text style={styles.actionDesc}>Manage multiple workspaces and invite links</Text>
              </View>
              <ChevronRight color="#475569" size={18} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Results for "{searchQuery}"</Text>
          </View>

          {isLoading || isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : displayDocs.length > 0 ? (
            <View style={styles.list}>
              {displayDocs.map(doc => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No documents found.</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Space for Fab
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1c1c1e', // dark text
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b', // slate-500
    letterSpacing: -0.2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff', // pure white
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statTitle: {
    color: '#64748b', // slate-500
    fontSize: 13,
    fontWeight: '500',
  },
  statValue: {
    color: '#1e293b', // slate-800
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtext: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  progressBarContainer: {
    marginTop: 8,
    width: '100%',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#f1f5f9', // slate-100
    borderRadius: 2.5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2.5,
  },
  progressText: {
    fontSize: 10,
    color: '#64748b',
  },
  blueCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  blueTitle: {
    color: '#2563eb',
  },
  blueValue: {
    color: '#1e3a8a',
  },
  blueSubtext: {
    color: '#3b82f6',
  },
  greenCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  greenTitle: {
    color: '#059669',
  },
  greenValue: {
    color: '#064e3b',
  },
  greenProgressBarTrack: {
    backgroundColor: '#d1fae5',
  },
  greenProgressText: {
    color: '#059669',
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b', // slate-800
  },
  actionsList: {
    marginTop: 4,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff', // pure white
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionCardPressed: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    color: '#1e293b', // slate-800
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDesc: {
    color: '#64748b', // slate-500
    fontSize: 13,
  },
  list: {
    gap: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  }
});
