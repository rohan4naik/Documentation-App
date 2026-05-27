import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { X, Search as SearchIcon, Hash, AlignLeft, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Document } from '../../models/types';
import { Input } from '../ui/Input';

interface DocumentInsightsModalProps {
  isVisible: boolean;
  onClose: () => void;
  document: Document;
  onSelectSearchResult?: (query: string, matchIndex: number) => void;
}

type TabType = 'SUMMARY' | 'METADATA' | 'SEARCH';

export function DocumentInsightsModal({ isVisible, onClose, document, onSelectSearchResult }: DocumentInsightsModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('SUMMARY');
  const [searchQuery, setSearchQuery] = useState('');

  const getSearchResults = () => {
    if (!searchQuery.trim() || !document.content) return { totalCount: 0, results: [] };
    
    const text = document.content;
    const query = searchQuery.toLowerCase();
    
    // 1. Find all match indices
    const matchIndices: number[] = [];
    let idx = text.toLowerCase().indexOf(query);
    while (idx !== -1) {
      matchIndices.push(idx);
      idx = text.toLowerCase().indexOf(query, idx + query.length);
    }
    
    if (matchIndices.length === 0) {
      return { totalCount: 0, results: [] };
    }

    // 2. Generate snippets by merging overlapping ones
    const mergedSnippets = [];
    let currentSnippetStart = -1;
    let currentSnippetEnd = -1;
    let currentMatchIndices: number[] = [];

    for (const matchIndex of matchIndices) {
      const start = Math.max(0, matchIndex - 40);
      const end = Math.min(text.length, matchIndex + query.length + 40);

      if (currentMatchIndices.length === 0 || start > currentSnippetEnd) {
        // New snippet
        if (currentMatchIndices.length > 0) {
          mergedSnippets.push({ start: currentSnippetStart, end: currentSnippetEnd, matchIndex: currentMatchIndices[0] });
        }
        currentSnippetStart = start;
        currentSnippetEnd = end;
        currentMatchIndices = [matchIndex];
      } else {
        // Overlaps, merge it
        currentSnippetEnd = Math.max(currentSnippetEnd, end);
        currentMatchIndices.push(matchIndex);
      }
    }
    if (currentMatchIndices.length > 0) {
      mergedSnippets.push({ start: currentSnippetStart, end: currentSnippetEnd, matchIndex: currentMatchIndices[0] });
    }

    // Now map them to standard result format
    const finalResults = mergedSnippets.slice(0, 25).map(r => {
      let snippet = text.substring(r.start, r.end).replace(/\s+/g, ' ');
      if (r.start > 0) snippet = '...' + snippet;
      if (r.end < text.length) snippet = snippet + '...';
      return {
        id: `${r.matchIndex}`,
        snippet
      };
    });

    return {
      totalCount: matchIndices.length,
      results: finalResults
    };
  };

  const renderHighlightedSnippet = (snippet: string, query: string) => {
    if (!query.trim()) return <Text>{snippet}</Text>;
    
    const parts = snippet.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <Text style={styles.snippetText}>
        {parts.map((part, idx) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <Text key={idx} style={styles.highlight}>{part}</Text>
            : part
        )}
      </Text>
    );
  };

  if (!isVisible) return null;

  const { totalCount, results } = getSearchResults();

  return (
    <Animated.View 
      entering={SlideInDown.duration(300)} 
      exiting={SlideOutDown.duration(200)}
      style={[styles.container, { paddingBottom: insets.bottom }]}
    >
      <View style={styles.header}>
        <View style={styles.dragIndicator} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Insights</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X color="#94a3b8" size={20} />
          </Pressable>
        </View>
        
        <View style={styles.segmentedControl}>
          {(['SUMMARY', 'METADATA', 'SEARCH'] as TabType[]).map((tab) => (
            <Pressable 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[styles.segmentTab, activeTab === tab && styles.segmentTabActive]}
            >
              <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
 
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.contentContainer}
      >
        <ScrollView style={styles.content}>
          {activeTab === 'SUMMARY' && (
            <View style={styles.tabContent}>
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Key Takeaways</Text>
                <View style={styles.bulletPoint}>
                  <View style={styles.bullet} />
                  <Text style={styles.summaryText}>This is an AI generated summary of {document.title}.</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <View style={styles.bullet} />
                  <Text style={styles.summaryText}>{document.excerpt}</Text>
                </View>
              </View>
              <View style={styles.aiRecommendation}>
                <Text style={styles.aiRecommendationTitle}>AI RECOMMENDATION</Text>
                <Text style={styles.aiRecommendationText}>Consider reviewing the highlighted metadata tags to better categorize similar documents in the future.</Text>
              </View>
            </View>
          )}
 
          {activeTab === 'METADATA' && (
            <View style={styles.tabContent}>
              <View style={styles.metadataItem}>
                <Hash color="#94a3b8" size={20} />
                <View style={styles.metadataTextContainer}>
                  <Text style={styles.metadataLabel}>Category</Text>
                  <Text style={styles.metadataValue}>{document.metadata.category}</Text>
                </View>
              </View>
              <View style={styles.metadataItem}>
                <AlignLeft color="#94a3b8" size={20} />
                <View style={styles.metadataTextContainer}>
                  <Text style={styles.metadataLabel}>Word Count</Text>
                  <Text style={styles.metadataValue}>{document.metadata.wordCount} words</Text>
                </View>
              </View>
              <View style={styles.metadataItem}>
                <Calendar color="#94a3b8" size={20} />
                <View style={styles.metadataTextContainer}>
                  <Text style={styles.metadataLabel}>Last Updated</Text>
                  <Text style={styles.metadataValue}>{new Date(document.updatedAt).toLocaleDateString()}</Text>
                </View>
              </View>
              <View style={styles.tagsContainer}>
                <Text style={styles.metadataLabel}>Tags</Text>
                <View style={styles.tagsList}>
                  {document.metadata.tags.map(tag => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
 
          {activeTab === 'SEARCH' && (
            <View style={styles.tabContent}>
              <View style={styles.searchContainer}>
                <Input 
                  placeholder="Search in document..." 
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  icon={true}
                />
              </View>
              {searchQuery.trim().length > 0 ? (
                totalCount > 0 ? (
                  <View style={styles.resultsList}>
                    <Text style={styles.resultsCount}>{totalCount} occurrences found</Text>
                    {results.map((res) => (
                      <Pressable 
                        key={res.id} 
                        style={styles.resultItem}
                        onPress={() => onSelectSearchResult?.(searchQuery, parseInt(res.id))}
                      >
                        {renderHighlightedSnippet(res.snippet, searchQuery)}
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.searchResults}>
                    <Text style={styles.searchPlaceholder}>No matches found for "{searchQuery}"</Text>
                  </View>
                )
              ) : (
                <View style={styles.searchResults}>
                  <Text style={styles.searchPlaceholder}>Type to search text in "{document.title}"</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.75,
    backgroundColor: '#ffffff', // pure white modal
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1', // slate-300
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9', // slate-100
    borderRadius: 8,
    padding: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#1e293b',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  summarySection: {
    marginBottom: 24,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 16,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginTop: 8,
    marginRight: 12,
  },
  summaryText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  aiRecommendation: {
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  aiRecommendationTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  aiRecommendationText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  metadataTextContainer: {
    marginLeft: 16,
  },
  metadataLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  metadataValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  tagsContainer: {
    marginTop: 16,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchResults: {
    alignItems: 'center',
    paddingTop: 32,
  },
  searchPlaceholder: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
  },
  resultsList: {
    marginTop: 8,
    gap: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  resultItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  snippetText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  highlight: {
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  }
});
