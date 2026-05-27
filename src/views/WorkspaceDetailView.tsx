import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useDocumentsViewModel } from '../viewmodels/useDocumentsViewModel';
import { useAppStore } from '../store/useAppStore';
import { DocumentCard } from '../components/cards/DocumentCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ChevronLeft, Upload, MessageSquare, Share2 } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';

interface WorkspaceDetailViewProps {
  id: string;
}

export function WorkspaceDetailView({ id }: WorkspaceDetailViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { documents, isLoading, uploadFile } = useDocumentsViewModel();
  const { workspaces, favoriteDocumentIds, toggleFavoriteDocument, setSelectedWorkspaceId, toggleChatbot } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Find the workspace metadata
  const workspace = useMemo(() => {
    return workspaces.find(w => w.id === id);
  }, [workspaces, id]);

  // 2. Set this workspace as active when mounted, reset on unmount
  useEffect(() => {
    if (id) {
      setSelectedWorkspaceId(id);
    }
    return () => {
      setSelectedWorkspaceId(null);
    };
  }, [id, setSelectedWorkspaceId]);

  // 3. Filter workspace documents by local search query
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (!searchQuery.trim()) return true;
      return (
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [documents, searchQuery]);

  const handleUpload = async () => {
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

  const handleShare = async () => {
    if (!workspace) return;
    try {
      await Sharing.shareAsync(workspace.shareLink || `https://docapp.com/share/${workspace.id}`, {
        dialogTitle: `Share Workspace ${workspace.name}`,
      });
    } catch (error) {
      // Fallback alert
      Alert.alert("Share Code", `Access Code: ${workspace.code}`);
    }
  };

  if (!workspace) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.errorText}>Workspace not found</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navigation Header */}
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [styles.backButton, pressed && styles.iconButtonPressed]} 
          onPress={() => router.back()}
        >
          <ChevronLeft color="#3b82f6" size={28} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {workspace.name}
        </Text>
        <Pressable 
          style={({ pressed }) => [styles.shareButton, pressed && styles.iconButtonPressed]} 
          onPress={handleShare}
        >
          <Share2 color="#3b82f6" size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        {/* Workspace Code Panel */}
        <View style={styles.infoPanel}>
          <View style={styles.infoTextWrapper}>
            <Text style={styles.infoLabel}>Workspace Code</Text>
            <Text style={styles.infoCode}>{workspace.code}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoTextWrapper}>
            <Text style={styles.infoLabel}>Total Files</Text>
            <Text style={styles.infoFiles}>{documents.length} files</Text>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Button 
            title="Upload File" 
            onPress={handleUpload}
            disabled={isLoading}
            style={styles.actionButton}
            // @ts-ignore
            icon={<Upload color="#fff" size={16} style={{ marginRight: 6 }} />}
          />
          <Button 
            title="Ask AI Workspace" 
            onPress={toggleChatbot}
            variant="outline"
            style={StyleSheet.flatten([styles.actionButton, styles.chatButton])}
            // @ts-ignore
            icon={<MessageSquare color="#2563eb" size={16} style={{ marginRight: 6 }} />}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search within this workspace..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={true}
          />
        </View>

        {/* Documents list */}
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Workspace Documents</Text>
          
          {isLoading && documents.length === 0 ? (
            <View style={styles.listLoadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : filteredDocs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No documents in this workspace.</Text>
            </View>
          ) : (
            filteredDocs.map(doc => (
              <DocumentCard 
                key={doc.id} 
                document={doc} 
                onPress={(docId) => router.push(`/document/${docId}`)}
                isFavorite={favoriteDocumentIds.includes(doc.id)}
                onToggleFavorite={toggleFavoriteDocument}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    padding: 24,
  },
  errorText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: -8,
  },
  shareButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: -8,
  },
  iconButtonPressed: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  infoPanel: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  infoTextWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoCode: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  infoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  infoFiles: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
  },
  chatButton: {
    borderColor: '#2563eb',
    borderWidth: 1,
  },
  searchContainer: {
    width: '100%',
  },
  list: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  listLoadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
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
    fontSize: 15,
  },
});
