import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { documentService } from '../services/DocumentService';

export function useSearchViewModel() {
  const { searchResults, setSearchState, user } = useAppStore();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const performSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchState([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await documentService.searchDocuments(query, user?.id);
      setSearchState(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    performSearch
  };
}
