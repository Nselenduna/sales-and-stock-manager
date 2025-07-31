import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import SearchBar from './SearchBar';
import useDebounce from '../hooks/useDebounce';

interface DebouncedSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceDelay?: number;
  initialValue?: string;
  showLoading?: boolean;
}

/**
 * A search bar component with built-in debounce functionality.
 * Only triggers the search callback after the user stops typing for the specified delay.
 */
const DebouncedSearchBar: React.FC<DebouncedSearchBarProps> = ({
  onSearch,
  placeholder,
  debounceDelay = 500,
  initialValue = '',
  showLoading = true,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);

  // Use our custom debounce hook
  const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);

  // Effect to handle the debounced search term
  useEffect(() => {
    // Only show loading indicator when the terms differ
    const isDebouncing = searchTerm !== debouncedSearchTerm;

    if (showLoading) {
      setIsSearching(isDebouncing);
    }

    // Only trigger search when debounced value changes
    if (!isDebouncing) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, searchTerm, onSearch, showLoading]);

  // Handle text changes
  const handleChangeText = (text: string) => {
    setSearchTerm(text);
  };

  return (
    <View style={styles.container}>
      <SearchBar
        value={searchTerm}
        onChangeText={handleChangeText}
        placeholder={placeholder}
      />
      {isSearching && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size='small' color='#007AFF' />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 30,
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    padding: 4,
    zIndex: 1,
  },
});

export default DebouncedSearchBar;
