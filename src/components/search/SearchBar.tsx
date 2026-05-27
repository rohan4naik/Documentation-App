import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Input } from '../ui/Input';
import { useSearchViewModel } from '../../viewmodels/useSearchViewModel';

export function SearchBar() {
  const { performSearch, isSearching } = useSearchViewModel();
  const [localQuery, setLocalQuery] = useState('');

  const handleSearch = (text: string) => {
    setLocalQuery(text);
    // Simple debounce behavior for mobile search
    setTimeout(() => {
      performSearch(text);
    }, 500);
  };

  return (
    <View style={styles.container}>
      <Input
        icon={true}
        placeholder="Search documents..."
        value={localQuery}
        onChangeText={handleSearch}
        containerStyle={styles.inputContainer}
      />
      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#94a3b8" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  inputContainer: {
    width: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    right: 12,
    top: 14,
  }
});
