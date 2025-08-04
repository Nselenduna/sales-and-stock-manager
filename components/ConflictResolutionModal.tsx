import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Product } from '../lib/supabase';
import { ConflictMetadata } from '../lib/sync/mergeProductChanges';

interface ConflictResolutionModalProps {
  visible: boolean;
  onClose: () => void;
  onResolve: (resolution: 'local' | 'remote' | 'merged') => void;
  conflict: {
    product: Product;
    localProduct: Product;
    remoteProduct: Product;
    conflictingFields: string[];
  };
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  onClose,
  onResolve,
  conflict,
}) => {
  const [selectedResolution, setSelectedResolution] = useState<
    'local' | 'remote' | 'merged'
  >('merged');

  const handleResolve = () => {
    Alert.alert(
      'Confirm Resolution',
      `Are you sure you want to resolve this conflict using the ${selectedResolution} version?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: () => {
            onResolve(selectedResolution);
            onClose();
          },
        },
      ]
    );
  };

  const renderFieldComparison = (field: string) => {
    const localValue = conflict.localProduct[field as keyof Product];
    const remoteValue = conflict.remoteProduct[field as keyof Product];

    return (
      <View key={field} style={styles.fieldContainer}>
        <Text style={styles.fieldName}>
          {field.charAt(0).toUpperCase() + field.slice(1)}
        </Text>
        <View style={styles.valueContainer}>
          <View style={styles.valueBox}>
            <Text style={styles.valueLabel}>Local</Text>
            <Text style={styles.valueText}>{String(localValue || '')}</Text>
          </View>
          <View style={styles.valueBox}>
            <Text style={styles.valueLabel}>Remote</Text>
            <Text style={styles.valueText}>{String(remoteValue || '')}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Conflict Resolution</Text>
            <Text style={styles.subtitle}>
              Changes to "{conflict.product.name}" conflict with the server
              version
            </Text>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Conflicting Fields:</Text>
            {conflict.conflictingFields.map(renderFieldComparison)}

            <View style={styles.resolutionSection}>
              <Text style={styles.sectionTitle}>Choose Resolution:</Text>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  selectedResolution === 'local' && styles.selectedOption,
                ]}
                onPress={() => setSelectedResolution('local')}
              >
                <Text style={styles.optionTitle}>Use Local Version</Text>
                <Text style={styles.optionDescription}>
                  Keep your local changes and overwrite server version
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  selectedResolution === 'remote' && styles.selectedOption,
                ]}
                onPress={() => setSelectedResolution('remote')}
              >
                <Text style={styles.optionTitle}>Use Remote Version</Text>
                <Text style={styles.optionDescription}>
                  Discard local changes and use server version
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  selectedResolution === 'merged' && styles.selectedOption,
                ]}
                onPress={() => setSelectedResolution('merged')}
              >
                <Text style={styles.optionTitle}>Auto-Merge (Recommended)</Text>
                <Text style={styles.optionDescription}>
                  Intelligently combine both versions
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={handleResolve}
            >
              <Text style={styles.resolveButtonText}>Resolve Conflict</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  valueBox: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  valueLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 14,
    color: '#333',
  },
  resolutionSection: {
    marginTop: 20,
  },
  optionButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  resolveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default ConflictResolutionModal;
