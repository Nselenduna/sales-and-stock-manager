import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import useAuthStore from '../../store/authStore';
import { supabase, Product } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface AddEditProductScreenProps {
  navigation: any;
  route: {
    params?: {
      product?: Product;
      mode: 'add' | 'edit';
    };
  };
}

interface FormData {
  name: string;
  sku: string;
  barcode: string;
  quantity: string;
  low_stock_threshold: string;
  location: string;
  unit_price: string;
  description: string;
  category: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const AddEditProductScreen: React.FC<AddEditProductScreenProps> = ({ navigation, route }) => {
  const { userRole } = useAuthStore();
  const { product, mode = 'add' } = route.params || {};
  
  const [formData, setFormData] = useState<FormData>({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    quantity: product?.quantity?.toString() || '0',
    low_stock_threshold: product?.low_stock_threshold?.toString() || '10',
    location: product?.location || '',
    unit_price: product?.unit_price?.toString() || '',
    description: product?.description || '',
    category: product?.category || '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Role-based permissions
  const canEditPricing = userRole === 'admin';
  const canEditAdvanced = userRole === 'admin' || userRole === 'staff';

  const totalSteps = showAdvancedFields ? 3 : 2;

  useEffect(() => {
    navigation.setOptions({
      title: mode === 'add' ? 'Add Product' : 'Edit Product',
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.headerButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, mode, saving]);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Product name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        break;
      case 'sku':
        if (!value.trim()) return 'SKU is required';
        if (value.length < 3) return 'SKU must be at least 3 characters';
        break;
      case 'quantity':
        const quantity = parseInt(value);
        if (isNaN(quantity) || quantity < 0) return 'Quantity must be a positive number';
        break;
      case 'low_stock_threshold':
        const threshold = parseInt(value);
        if (isNaN(threshold) || threshold < 0) return 'Threshold must be a positive number';
        break;
      case 'unit_price':
        if (value && canEditPricing) {
          const price = parseFloat(value);
          if (isNaN(price) || price < 0) return 'Price must be a positive number';
        }
        break;
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field as keyof FormData]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBarcodeScan = () => {
    // TODO: Implement barcode scanning
    Alert.alert('Barcode Scanner', 'Barcode scanning will be implemented in the next update');
  };

  const handleGenerateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const newSKU = `SKU${timestamp}${random}`;
    setFormData(prev => ({ ...prev, sku: newSKU }));
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim() || null,
        quantity: parseInt(formData.quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        location: formData.location.trim(),
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        description: formData.description.trim(),
        category: formData.category.trim(),
        updated_at: new Date().toISOString(),
      };

      let result;
      if (mode === 'add') {
        // Check if SKU already exists
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, sku')
          .eq('sku', productData.sku)
          .single();

        if (existingProduct) {
          Alert.alert(
            'SKU Already Exists',
            `A product with SKU "${productData.sku}" already exists. Please use a different SKU.`,
            [{ text: 'OK' }]
          );
          setSaving(false);
          return;
        }

        result = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();
      } else {
        // For edit mode, check if SKU exists on other products
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, sku')
          .eq('sku', productData.sku)
          .neq('id', product?.id)
          .single();

        if (existingProduct) {
          Alert.alert(
            'SKU Already Exists',
            `A product with SKU "${productData.sku}" already exists. Please use a different SKU.`,
            [{ text: 'OK' }]
          );
          setSaving(false);
          return;
        }

        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', product?.id)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      Alert.alert(
        'Success',
        `Product ${mode === 'add' ? 'added' : 'updated'} successfully`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        Alert.alert(
          'SKU Already Exists',
          'A product with this SKU already exists. Please use a different SKU.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to save product. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View key={index} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep > index + 1 ? styles.stepCompleted :
            currentStep === index + 1 ? styles.stepActive :
            styles.stepInactive
          ]}>
            {currentStep > index + 1 ? (
              <Icon name="checkmark" size={16} color="white" />
            ) : (
              <Text style={styles.stepNumber}>{index + 1}</Text>
            )}
          </View>
          <Text style={styles.stepLabel}>
            {index === 0 ? 'Basic Info' : index === 1 ? 'Stock Details' : 'Advanced'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderBasicInfoStep = () => (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={formData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          placeholder="Enter product name"
          placeholderTextColor="#999"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>SKU *</Text>
        <View style={styles.skuContainer}>
          <TextInput
            style={[styles.input, styles.skuInput, errors.sku && styles.inputError]}
            value={formData.sku}
            onChangeText={(value) => handleInputChange('sku', value)}
            placeholder="Enter SKU"
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.generateButton} onPress={handleGenerateSKU}>
            <Text style={styles.generateButtonText}>Generate</Text>
          </TouchableOpacity>
        </View>
        {errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Barcode (Optional)</Text>
        <View style={styles.barcodeContainer}>
          <TextInput
            style={[styles.input, styles.barcodeInput]}
            value={formData.barcode}
            onChangeText={(value) => handleInputChange('barcode', value)}
            placeholder="Enter barcode or scan"
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.scanButton} onPress={handleBarcodeScan}>
            <Icon name="qr-code" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          value={formData.category}
          onChangeText={(value) => handleInputChange('category', value)}
          placeholder="Enter category"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          placeholder="Enter product description"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStockDetailsStep = () => (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Stock Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Quantity *</Text>
        <TextInput
          style={[styles.input, errors.quantity && styles.inputError]}
          value={formData.quantity}
          onChangeText={(value) => handleInputChange('quantity', value)}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
        {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Low Stock Threshold *</Text>
        <TextInput
          style={[styles.input, errors.low_stock_threshold && styles.inputError]}
          value={formData.low_stock_threshold}
          onChangeText={(value) => handleInputChange('low_stock_threshold', value)}
          placeholder="10"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
        <Text style={styles.helpText}>Alert will be shown when stock falls below this level</Text>
        {errors.low_stock_threshold && <Text style={styles.errorText}>{errors.low_stock_threshold}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={formData.location}
          onChangeText={(value) => handleInputChange('location', value)}
          placeholder="e.g., Warehouse A, Shelf 3"
          placeholderTextColor="#999"
        />
      </View>

      {canEditPricing && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Unit Price</Text>
          <TextInput
            style={[styles.input, errors.unit_price && styles.inputError]}
            value={formData.unit_price}
            onChangeText={(value) => handleInputChange('unit_price', value)}
            placeholder="0.00"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
          {errors.unit_price && <Text style={styles.errorText}>{errors.unit_price}</Text>}
        </View>
      )}
    </View>
  );

  const renderAdvancedStep = () => (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Advanced Settings</Text>
      <Text style={styles.helpText}>These settings are only available to admin users</Text>
      
      {/* Add advanced fields here in future updates */}
      <View style={styles.placeholderContainer}>
        <Icon name="settings" size={48} color="#ccc" />
        <Text style={styles.placeholderText}>Advanced settings coming soon</Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfoStep();
      case 2:
        return renderStockDetailsStep();
      case 3:
        return renderAdvancedStep();
      default:
        return renderBasicInfoStep();
    }
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderStepIndicator()}
        
        <View style={styles.content}>
          {renderCurrentStep()}
        </View>

        <View style={styles.stepNavigation}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.navButton} onPress={handlePrevStep}>
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < totalSteps ? (
            <TouchableOpacity 
              style={[styles.navButton, styles.primaryButton]} 
              onPress={handleNextStep}
            >
              <Text style={[styles.navButtonText, styles.primaryButtonText]}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.navButton, styles.primaryButton]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[styles.navButtonText, styles.primaryButtonText]}>
                  {mode === 'add' ? 'Add Product' : 'Update Product'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {canEditAdvanced && (
          <View style={styles.advancedToggle}>
            <Text style={styles.advancedToggleText}>Show Advanced Fields</Text>
            <Switch
              value={showAdvancedFields}
              onValueChange={setShowAdvancedFields}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
              thumbColor={showAdvancedFields ? '#fff' : '#f4f3f4'}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepActive: {
    backgroundColor: '#007AFF',
  },
  stepCompleted: {
    backgroundColor: '#34C759',
  },
  stepInactive: {
    backgroundColor: '#e0e0e0',
  },
  stepNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  step: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  helpText: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  skuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skuInput: {
    flex: 1,
    marginRight: 10,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeInput: {
    flex: 1,
    marginRight: 10,
  },
  scanButton: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  navButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  primaryButtonText: {
    color: 'white',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  advancedToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerButton: {
    paddingHorizontal: 15,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default AddEditProductScreen;
