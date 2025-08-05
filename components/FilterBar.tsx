import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from './Icon';

interface FilterBarProps {
  activeFilter: 'all' | 'low_stock' | 'out_of_stock';
  onFilterChange: (filter: 'all' | 'low_stock' | 'out_of_stock') => void;
  sortOrder: 'asc' | 'desc';
  onSortToggle: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  activeFilter,
  onFilterChange,
  sortOrder,
  onSortToggle,
}) => {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'low_stock', label: 'Low Stock' },
    { key: 'out_of_stock', label: 'Out of Stock' },
  ] as const;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filters.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterButton,
              activeFilter === key && styles.filterButtonActive,
            ]}
            onPress={() => onFilterChange(key)}
            accessible={true}
            accessibilityLabel={`Filter by ${label}`}
            accessibilityRole='button'
            accessibilityState={{ selected: activeFilter === key }}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === key && styles.filterButtonTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={onSortToggle}
        accessible={true}
        accessibilityLabel={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
        accessibilityRole='button'
      >
        <Icon
          name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
          size={20}
          color='#007AFF'
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  sortButton: {
    padding: 8,
    marginLeft: 'auto',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(FilterBar);
