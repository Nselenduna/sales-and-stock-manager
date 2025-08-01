import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from './Icon';

export type PaymentMethod = 'cash' | 'card' | 'other';

interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  icon: string;
  description: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'cash',
    label: 'Cash',
    icon: 'cash',
    description: 'Cash payment',
  },
  {
    id: 'card',
    label: 'Card',
    icon: 'card',
    description: 'Credit/Debit card',
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'help-circle',
    description: 'Other payment method',
  },
];

interface PaymentSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const PaymentSelector: React.FC<PaymentSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  disabled = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedOption = PAYMENT_METHODS.find(method => method.id === selectedMethod);

  const handleSelectMethod = (method: PaymentMethod) => {
    onSelectMethod(method);
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Payment Method</Text>
      
      <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
        accessible={true}
        accessibilityLabel={`Payment method: ${selectedOption?.label}`}
        accessibilityRole="button"
      >
        <View style={styles.selectorContent}>
          <Icon name={selectedOption?.icon || 'help-circle'} size={20} color="#666" />
          <Text style={styles.selectorText}>{selectedOption?.label}</Text>
          <Icon name="chevron-down" size={16} color="#666" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Close payment method selector"
                accessibilityRole="button"
              >
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.methodsList}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodOption,
                    selectedMethod === method.id && styles.selectedMethod,
                  ]}
                  onPress={() => handleSelectMethod(method.id)}
                  accessible={true}
                  accessibilityLabel={`${method.label} payment method`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedMethod === method.id }}
                >
                  <View style={styles.methodContent}>
                    <Icon 
                      name={method.icon} 
                      size={24} 
                      color={selectedMethod === method.id ? '#007AFF' : '#666'} 
                    />
                    <View style={styles.methodText}>
                      <Text style={[
                        styles.methodLabel,
                        selectedMethod === method.id && styles.selectedMethodText,
                      ]}>
                        {method.label}
                      </Text>
                      <Text style={styles.methodDescription}>
                        {method.description}
                      </Text>
                    </View>
                  </View>
                  {selectedMethod === method.id && (
                    <Icon name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  disabled: {
    opacity: 0.5,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  methodsList: {
    padding: 20,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedMethod: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodText: {
    marginLeft: 12,
    flex: 1,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedMethodText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default PaymentSelector; 