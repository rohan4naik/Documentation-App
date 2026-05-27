import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useDocumentsViewModel } from '../viewmodels/useDocumentsViewModel';
import { useAppStore } from '../store/useAppStore';
import { DocumentCard } from '../components/cards/DocumentCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Upload, SlidersHorizontal } from 'lucide-react-native';

export function DocumentsView() {
  const { documents, isLoading, uploadFile } = useDocumentsViewModel();
  const { favoriteDocumentIds, toggleFavoriteDocument } = useAppStore();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

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

  const categories = useMemo(() => {
    const cats = new Set(documents.map(doc => doc.metadata.category));
    return ['All', ...Array.from(cats)];
  }, [documents]);

  const favoriteDocuments = useMemo(() => {
    return documents.filter(doc => favoriteDocumentIds.includes(doc.id));
  }, [documents, favoriteDocumentIds]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchQuery.trim() || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || doc.metadata.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedCategory]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Documents</Text>
        </View>
        <Button 
          title="Upload" 
          onPress={handleUpload}
          disabled={isLoading}
          style={styles.uploadButton}
          // @ts-ignore
          icon={<Upload color="#fff" size={16} style={{marginRight: 6}} />}
        />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={true}
          />
        </View>
        <Pressable 
          onPress={() => setShowFilters(!showFilters)} 
          style={[
            styles.filterButton, 
            (showFilters || selectedCategory !== 'All') && styles.filterButtonActive
          ]}
        >
          <SlidersHorizontal 
            color={showFilters || selectedCategory !== 'All' ? '#3b82f6' : '#94a3b8'} 
            size={20} 
          />
        </Pressable>
      </View>

      {showFilters && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive
                ]}
              >
                <Text style={[
                  styles.categoryText,
                  isActive && styles.categoryTextActive
                ]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Pinned Documents Section */}
      {!isLoading && favoriteDocuments.length > 0 && (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>Pinned Documents</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favoritesScrollContent}
          >
            {favoriteDocuments.map(doc => (
              <View key={doc.id} style={styles.favoriteCardWrapper}>
                <DocumentCard 
                  document={doc}
                  onPress={(id) => router.push(`/document/${id}`)}
                  isFavorite={true}
                  onToggleFavorite={toggleFavoriteDocument}
                  compact={true}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading && documents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredDocuments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No documents found.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>All Documents</Text>
          {filteredDocuments.map(doc => (
            <DocumentCard 
              key={doc.id} 
              document={doc} 
              onPress={(id) => router.push(`/document/${id}`)}
              isFavorite={favoriteDocumentIds.includes(doc.id)}
              onToggleFavorite={toggleFavoriteDocument}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7', // light background
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
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
  uploadButton: {
    paddingHorizontal: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
  },
  filterButton: {
    height: 48,
    width: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff', // white
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  categoriesContainer: {
    marginBottom: 20,
    maxHeight: 40,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff', // white
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: '#2563eb', // active blue
    borderColor: '#2563eb',
  },
  categoryText: {
    color: '#64748b', // slate-500
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  list: {
    gap: 12,
  },
  favoritesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569', // slate-600
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  favoritesScrollContent: {
    gap: 16,
    paddingRight: 16,
  },
  favoriteCardWrapper: {
    width: 280,
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
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
});
