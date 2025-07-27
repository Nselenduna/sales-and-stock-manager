import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from './Icon';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  label?: string;
  visible?: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = 'add',
  label = 'Add Item',
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Icon name={icon} size={24} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default FloatingActionButton;
