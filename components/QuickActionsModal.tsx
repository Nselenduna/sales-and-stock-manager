import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from './Icon';

interface QuickActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
}

const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  visible,
  onClose,
  onAction,
}) => {
  const quickActions: QuickAction[] = [
    {
      id: 'scan-product',
      title: 'Scan Product',
      description: 'Scan barcode to quickly find or add products',
      icon: 'camera',
      color: '#007AFF',
      backgroundColor: '#f0f8ff',
    },
    {
      id: 'create-sale',
      title: 'Create Sale',
      description: 'Record a new sale transaction',
      icon: 'shopping-cart',
      color: '#34C759',
      backgroundColor: '#f0fff0',
    },
    {
      id: 'add-stock',
      title: 'Add Stock',
      description: 'Quickly add inventory to existing products',
      icon: 'plus',
      color: '#FF9500',
      backgroundColor: '#fff8f0',
    },
    {
      id: 'view-inventory',
      title: 'View Inventory',
      description: 'Browse all products and stock levels',
      icon: 'list',
      color: '#5856D6',
      backgroundColor: '#f8f0ff',
    },
    {
      id: 'stock-alerts',
      title: 'Stock Alerts',
      description: 'Check items that need restocking',
      icon: 'alert-circle',
      color: '#FF3B30',
      backgroundColor: '#fff0f0',
    },
    {
      id: 'search-products',
      title: 'Search Products',
      description: 'Find products by name, SKU, or barcode',
      icon: 'search',
      color: '#5AC8FA',
      backgroundColor: '#f0faff',
    },
  ];

  const handleActionPress = (actionId: string) => {
    onAction(actionId);
    onClose();
  };

  const handleBackdropPress = () => {
    onClose();
  };

  const renderActionItem = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={[
        styles.actionCard,
        { backgroundColor: action.backgroundColor },
      ]}
      onPress={() => handleActionPress(action.id)}
      accessible={true}
      accessibilityLabel={action.title}
      accessibilityHint={action.description}
      accessibilityRole="button"
    >
      <View style={styles.actionIconContainer}>
        <View style={[styles.iconBackground, { backgroundColor: action.color }]}>
          <Icon name={action.icon} size={24} color="white" />
        </View>
      </View>
      
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionDescription}>{action.description}</Text>
      </View>
      
      <Icon name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={handleBackdropPress}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Quick Actions</Text>
            <Text style={styles.subtitle}>
              Access common tasks and features
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessible={true}
              accessibilityLabel="Close quick actions"
              accessibilityRole="button"
            >
              <Icon name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.actionsGrid}>
              {quickActions.map(renderActionItem)}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};



const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  content: {
    padding: 20,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconContainer: {
    marginRight: 16,
  },
  iconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default QuickActionsModal; 