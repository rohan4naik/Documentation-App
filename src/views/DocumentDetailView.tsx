import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles, Trash2, X, Edit2, ExternalLink, FileText } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDocumentsViewModel } from '../viewmodels/useDocumentsViewModel';
import { DocumentInsightsModal } from '../components/document/DocumentInsightsModal';
import { supabase } from '../services/supabaseClient';
import type { Document } from '../models/types';

interface DocumentDetailViewProps {
  id: string;
}

export function DocumentDetailView({ id }: DocumentDetailViewProps) {
  const router = useRouter();
  const { documents, isLoading, deleteFile, renameFile } = useDocumentsViewModel();
  const insets = useSafeAreaInsets();
  const [document, setDocument] = useState<Document | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isRenameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  
  // Search and Scroll states
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeQuery, setActiveQuery] = useState('');
  const [contentHeight, setContentHeight] = useState(0);
  const [viewMode, setViewMode] = useState<'pdf' | 'text'>('pdf');

  const isPdf = document ? (document.metadata.tags.includes('pdf') || document.title.toLowerCase().endsWith('.pdf')) : false;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (documents.length > 0 && id) {
      const doc = documents.find(d => d.id === id);
      if (doc) {
        if (!document || document.id !== doc.id) {
          setDocument(doc);
          const docIsPdf = doc.metadata.tags.includes('pdf') || doc.title.toLowerCase().endsWith('.pdf');
          setViewMode(docIsPdf ? 'pdf' : 'text');
        } else {
          setDocument(doc);
        }
      }
    }
  }, [documents, id, document]);

  useEffect(() => {
    if (document && isPdf) {
      supabase.storage
        .from('document_files')
        .createSignedUrl(`${document.id}.pdf`, 3600) // 1 hour expiry
        .then(({ data, error }) => {
          if (data?.signedUrl) {
            setPdfUrl(data.signedUrl);
          } else {
            console.error('Error fetching signed URL:', error);
          }
        });
    }
  }, [document, isPdf]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (id) {
              const success = await deleteFile(id);
              if (success) {
                router.back();
              } else {
                Alert.alert("Error", "Failed to delete the document.");
              }
            }
          }
        }
      ]
    );
  };

  const handleRename = () => {
    if (!document || !id) return;
    setRenameValue(document.title);
    setRenameModalVisible(true);
  };

  const submitRename = async () => {
    if (!document || !id) return;
    const trimmedTitle = renameValue.trim();
    if (trimmedTitle.length === 0) {
      Alert.alert("Error", "Document title cannot be empty.");
      return;
    }
    
    setRenameModalVisible(false);
    const success = await renameFile(id, trimmedTitle);
    if (success) {
      setDocument(prev => prev ? { ...prev, title: trimmedTitle } : null);
    } else {
      Alert.alert("Error", "Failed to rename document.");
    }
  };

  const handleSelectSearchResult = (query: string, matchIndex: number) => {
    setActiveQuery(query);
    setModalVisible(false);
    
    if (isPdf) {
      setViewMode('text');
    }

    // Scroll to position in the text representation of the PDF
    setTimeout(() => {
      if (document?.content && contentHeight > 0) {
        const ratio = matchIndex / document.content.length;
        // Add a little offset to center the text
        const estimatedY = Math.max(0, (ratio * contentHeight) - 100);
        scrollViewRef.current?.scrollTo({ y: estimatedY, animated: true });
      }
    }, 100);
  };

  const getPdfSourceUri = () => {
    if (!pdfUrl) return '';
    let url = pdfUrl;
    if (activeQuery) {
      url = `${pdfUrl}#search="${encodeURIComponent(activeQuery)}"`;
    }
    if (Platform.OS === 'android') {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
    }
    return url;
  };

  const renderHighlightedBody = () => {
    if (!document) return null;
    if (!activeQuery) return <Text style={styles.body}>{document.content}</Text>;
    
    const parts = document.content.split(new RegExp(`(${activeQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <Text style={styles.body}>
        {parts.map((part, idx) => 
          part.toLowerCase() === activeQuery.toLowerCase() 
            ? <Text key={idx} style={styles.activeHighlight}>{part}</Text>
            : part
        )}
      </Text>
    );
  };

  if (isLoading || !document) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#1e293b" size={24} />
        </Pressable>
        <View style={styles.headerRight}>
          {isPdf && pdfUrl && (
            <Pressable 
              onPress={async () => {
                const targetUrl = activeQuery 
                  ? `${pdfUrl}#search="${encodeURIComponent(activeQuery)}"` 
                  : pdfUrl;
                await WebBrowser.openBrowserAsync(targetUrl);
              }} 
              style={styles.openExternalButton}
            >
              <ExternalLink color="#475569" size={18} />
            </Pressable>
          )}
          <Pressable onPress={() => setModalVisible(true)} style={styles.insightsButton}>
            <Sparkles color="#3b82f6" size={18} style={{ marginRight: 6 }} />
            <Text style={styles.insightsText}>Insights</Text>
          </Pressable>
          <Pressable onPress={handleRename} style={styles.renameButton}>
            <Edit2 color="#475569" size={18} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Trash2 color="#ef4444" size={20} />
          </Pressable>
        </View>
      </View>
      
      {activeQuery.length > 0 && (
        <View style={styles.activeSearchBanner}>
          <Text style={styles.activeSearchText}>Highlighting: "{activeQuery}"</Text>
          <Pressable onPress={() => setActiveQuery('')} style={styles.clearSearchButton}>
            <X color="#475569" size={16} />
          </Pressable>
        </View>
      )}

      <View style={styles.contentHeader}>
        <Text style={styles.title}>{document.title}</Text>
        <View style={styles.metadataRow}>
          <Text style={styles.category}>{document.metadata.category}</Text>
          <Text style={styles.date}>• {new Date(document.updatedAt).toLocaleDateString()}</Text>
        </View>
      </View>

      {isPdf && (
        <View style={styles.viewModeContainer}>
          <TouchableOpacity 
            onPress={() => setViewMode('pdf')} 
            onPressOut={() => setViewMode('pdf')}
            style={[styles.viewModeButton, viewMode === 'pdf' && styles.viewModeButtonActive]}
            activeOpacity={0.7}
          >
            <FileText color={viewMode === 'pdf' ? '#2563eb' : '#64748b'} size={15} style={{ marginRight: 6 }} />
            <Text style={[styles.viewModeText, viewMode === 'pdf' && styles.viewModeTextActive]}>Original PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('text')} 
            onPressOut={() => setViewMode('text')}
            style={[styles.viewModeButton, viewMode === 'text' && styles.viewModeButtonActive]}
            activeOpacity={0.7}
          >
            <Sparkles color={viewMode === 'text' ? '#2563eb' : '#64748b'} size={15} style={{ marginRight: 6 }} />
            <Text style={[styles.viewModeText, viewMode === 'text' && styles.viewModeTextActive]}>Extracted Text</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPdf && viewMode === 'pdf' ? (
        pdfUrl ? (
          <View style={styles.pdfWebView}>
            <WebView 
              key={`${getPdfSourceUri()}_${activeQuery}`}
              source={{ uri: getPdfSourceUri() }}
              style={{ flex: 1 }}
              scalesPageToFit={true}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>
        ) : (
          <View style={[styles.pdfWebView, styles.loadingContainer]}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={{ marginTop: 8, color: '#64748b' }}>Loading PDF...</Text>
          </View>
        )
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
        >
          <View 
            style={styles.documentCard}
            onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
          >
            {renderHighlightedBody()}
          </View>
        </ScrollView>
      )}

      <DocumentInsightsModal 
        isVisible={isModalVisible} 
        onClose={() => setModalVisible(false)} 
        document={document} 
        onSelectSearchResult={handleSelectSearchResult}
      />

      <Modal
        transparent={true}
        visible={isRenameModalVisible}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable 
            style={styles.modalDismissArea} 
            onPress={() => setRenameModalVisible(false)} 
          />
          <View style={styles.renameModalContent}>
            <Text style={styles.renameModalTitle}>Rename Document</Text>
            <Text style={styles.renameModalSubtitle}>Enter a new title for this document</Text>
            <TextInput
              style={styles.renameTextInput}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus={true}
              placeholder="Document Title"
              placeholderTextColor="#94a3b8"
              selectTextOnFocus={true}
            />
            <View style={styles.renameModalButtons}>
              <Pressable
                style={[styles.modalButton, styles.renameCancelButton]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.renameSaveButton]}
                onPress={submitRename}
              >
                <Text style={styles.renameSaveText}>Rename</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  insightsText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  renameButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(71, 85, 105, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.15)',
  },
  openExternalButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(71, 85, 105, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.15)',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  activeSearchBanner: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#c7d2fe',
  },
  activeSearchText: {
    color: '#3730a3',
    fontWeight: '600',
    fontSize: 13,
  },
  clearSearchButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  contentHeader: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 32,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  date: {
    color: '#64748b',
    fontSize: 13,
    marginLeft: 8,
  },
  documentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  body: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 28,
  },
  activeHighlight: {
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
  },
  pdfWebView: {
    flex: 1,
    marginTop: 8,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    elevation: 1,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    zIndex: 10,
    elevation: 3,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  viewModeTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFill,
  },
  renameModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  renameModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  renameModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  renameTextInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 24,
  },
  renameModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  renameCancelButton: {
    backgroundColor: '#f1f5f9',
  },
  renameSaveButton: {
    backgroundColor: '#2563eb',
  },
  renameCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  renameSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  }
});
