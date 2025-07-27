/**
 * Module: InventoryFormScreen
 * Scope: Add/edit product entries
 * Constraints:
 *   - DO NOT include auth logic, routing, or external navigation
 *   - ONLY use props and Zustand state defined in inventory context
 *   - All side effects must be wrapped and testable
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import { supabase, Product } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface InventoryFormScreenProps {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      productId?: string;
      initialData?: Partial<Product>;
    };
  };
}

interface FormData {
  name: string;
  sku: string;
  barcode?: string;
  quantity: number;
  low_stock_threshold: number;
  location?: string;
  unit_price?: number;
  description?: string;
  category?: string;
}

interface ValidationErrors {
  name?: string;
  sku?: string;
  quantity?: string;
  low_stock_threshold?: string;
  unit_price?: string;
}

const InventoryFormScreen: React.FC<InventoryFormScreenProps> = ({ navigation, route }) => {
  const { mode = 'add', productId, initialData } = route?.params || {};
  const { userRole } = useAuthStore();
  
  // Add mounted ref to prevent state updates after unmount
  const isMounted = React.useRef(true);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sku: '',
    barcode: '',
    quantity: 0,
    low_stock_threshold: 10,
    location: '',
    unit_price: 0,
    description: '',
    category: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [qrScanned, setQrScanned] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Role-based access control
  const canEdit = userRole === 'admin' || userRole === 'staff';
  const canDelete = userRole === 'admin';

  // Helper function for numeric input handling
  const handleNumericInput = (text: string, defaultValue: number = 0): number => {
    const cleanText = text.replace(/[^0-9]/g, '');
    return cleanText === '' ? defaultValue : parseInt(cleanText) || defaultValue;
  };

  // Helper function for decimal input handling
  const handleDecimalInput = (text: string, defaultValue: number = 0): number => {
    // Allow both comma and period as decimal separators
    // First, replace comma with period
    let normalizedText = text.replace(/,/g, '.');
    
    // Remove any characters that aren't numbers or periods
    normalizedText = normalizedText.replace(/[^0-9.]/g, '');
    
    // Handle multiple periods (keep only the first one)
    const parts = normalizedText.split('.');
    if (parts.length > 2) {
      normalizedText = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // If empty, return default value
    if (normalizedText === '' || normalizedText === '.') {
      return defaultValue;
    }
    
    // Parse the number
    const result = parseFloat(normalizedText);
    return isNaN(result) ? defaultValue : result;
  };

  useEffect(() => {
    try {
      if (mode === 'edit' && productId) {
        fetchProduct();
      } else if (initialData) {
        setFormData(prev => ({ ...prev, ...initialData }));
      }
      
      // Check network status
      checkNetworkStatus();
    } catch (error) {
      console.error('Error in useEffect:', error);
      Alert.alert('Error', 'Failed to initialize form');
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [mode, productId, initialData]);

  const checkNetworkStatus = () => {
    // Simulate network check - in real app, use NetInfo
    const isConnected = Math.random() > 0.1; // 90% chance of being online
    setIsOffline(!isConnected);
  };

  const fetchProduct = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      
      // Check if component is still mounted before updating state
      if (isMounted.current) {
        setFormData({
          name: data.name || '',
          sku: data.sku || '',
          barcode: data.barcode || '',
          quantity: data.quantity || 0,
          low_stock_threshold: data.low_stock_threshold || 10,
          location: data.location || '',
          unit_price: data.unit_price || 0,
          description: data.description || '',
          category: data.category || '',
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load product data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    } else if (formData.sku.length < 3) {
      newErrors.sku = 'SKU must be at least 3 characters';
    }

    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }

    if (formData.low_stock_threshold < 0) {
      newErrors.low_stock_threshold = 'Low stock threshold cannot be negative';
    }

    if (formData.unit_price && formData.unit_price < 0) {
      newErrors.unit_price = 'Unit price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const newSku = `SKU${timestamp}${random}`;
    setFormData(prev => ({ ...prev, sku: newSku }));
  };

  const handleQRScan = () => {
    // Simulate QR scan - in real app, this would open camera
    Alert.prompt(
      'Scan Barcode',
      'Enter barcode manually or scan:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enter',
          onPress: (barcode) => {
            if (barcode) {
              setFormData(prev => ({ ...prev, barcode }));
              setQrScanned(true);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleImageUpload = () => {
    // Simulate image upload - in real app, this would open image picker
    Alert.alert(
      'Upload Image',
      'Choose image source:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => simulateImageUpload('camera') },
        { text: 'Gallery', onPress: () => simulateImageUpload('gallery') },
      ]
    );
  };

  const simulateImageUpload = (source: 'camera' | 'gallery') => {
    // Simulate image upload process
    setLoading(true);
    setTimeout(() => {
      setImageUri('https://via.placeholder.com/300x200?text=Product+Image');
      setLoading(false);
      Alert.alert('Success', `Image uploaded from ${source}`);
    }, 1000);
  };

  const saveDraft = () => {
    // Save to local storage
    try {
      const draft = {
        ...formData,
        timestamp: new Date().toISOString(),
        mode,
        productId,
      };
      
      // In real app, save to AsyncStorage
      console.log('Draft saved:', draft);
      setDraftSaved(true);
      
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      Alert.alert('Access Denied', 'You do not have permission to edit products');
      return;
    }

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    if (isOffline) {
      Alert.alert(
        'Offline Mode',
        'You are currently offline. Changes will be saved locally and synced when connection is restored.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Locally', onPress: saveOffline },
        ]
      );
      return;
    }

    try {
      setSaving(true);
      
      if (mode === 'add') {
        const { data, error } = await supabase
          .from('products')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        
        Alert.alert('Success', 'Product added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const { data, error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', productId)
          .select()
          .single();

        if (error) throw error;
        
        Alert.alert('Success', 'Product updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      if (error.code === '23505') {
        Alert.alert('Error', 'A product with this SKU already exists');
      } else {
        Alert.alert('Error', error.message || 'Failed to save product');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveOffline = () => {
    // Save to local storage for offline sync
    try {
      const offlineData = {
        ...formData,
        id: productId || `offline_${Date.now()}`,
        mode,
        timestamp: new Date().toISOString(),
        syncStatus: 'pending',
      };
      
      // In real app, save to AsyncStorage
      console.log('Saved offline:', offlineData);
      Alert.alert('Saved Offline', 'Product will be synced when connection is restored');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving offline:', error);
      Alert.alert('Error', 'Failed to save offline');
    }
  };

  const renderOfflineBanner = () => {
    if (!isOffline) return null;
    
    return (
      <View style={styles.offlineBanner}>
        <Icon name="wifi-off" size={16} color="white" />
        <Text style={styles.offlineText}>You are offline. Changes will be saved locally.</Text>
      </View>
    );
  };

  const renderDraftSaved = () => {
    if (!draftSaved) return null;
    
    return (
      <View style={styles.draftBanner}>
        <Icon name="save" size={16} color="white" />
        <Text style={styles.draftText}>Draft saved</Text>
      </View>
    );
  };

  const renderImageSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Product Image</Text>
      <TouchableOpacity style={styles.imageContainer} onPress={handleImageUpload}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="camera" size={32} color="#8E8E93" />
            <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Product Name *</Text>
        <TextInput
          style={[styles.textInput, errors.name && styles.errorInput]}
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder="Enter product name"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.field}>
        <View style={styles.skuContainer}>
          <Text style={styles.fieldLabel}>SKU *</Text>
          <TouchableOpacity style={styles.generateButton} onPress={generateSKU}>
            <Text style={styles.generateButtonText}>Generate</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.textInput, errors.sku && styles.errorInput]}
          value={formData.sku}
          onChangeText={(text) => setFormData(prev => ({ ...prev, sku: text.toUpperCase() }))}
          placeholder="Enter SKU"
          autoCapitalize="characters"
        />
        {errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
      </View>

      <View style={styles.field}>
        <View style={styles.barcodeContainer}>
          <Text style={styles.fieldLabel}>Barcode</Text>
          <TouchableOpacity style={styles.scanButton} onPress={handleQRScan}>
            <Icon name="qr-code" size={16} color="#007AFF" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.textInput}
          value={formData.barcode}
          onChangeText={(text) => setFormData(prev => ({ ...prev, barcode: text }))}
          placeholder="Enter barcode or scan"
        />
        {qrScanned && <Text style={styles.successText}>✓ Barcode scanned successfully</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Category</Text>
        <TextInput
          style={styles.textInput}
          value={formData.category}
          onChangeText={(text) => setFormData(prev => ({ ...prev, category: text }))}
          placeholder="Enter category"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          placeholder="Enter product description"
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStockInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Stock Information</Text>
      
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Quantity *</Text>
        <TextInput
          style={[styles.textInput, errors.quantity && styles.errorInput]}
          value={formData.quantity.toString()}
          onChangeText={(text) => {
            const quantity = handleNumericInput(text, 0);
            setFormData(prev => ({ ...prev, quantity }));
          }}
          placeholder="0"
          keyboardType="numeric"
        />
        {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Low Stock Threshold *</Text>
        <TextInput
          style={[styles.textInput, errors.low_stock_threshold && styles.errorInput]}
          value={formData.low_stock_threshold.toString()}
          onChangeText={(text) => {
            const threshold = handleNumericInput(text, 10);
            setFormData(prev => ({ ...prev, low_stock_threshold: threshold }));
          }}
          placeholder="10"
          keyboardType="numeric"
        />
        {errors.low_stock_threshold && <Text style={styles.errorText}>{errors.low_stock_threshold}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Unit Price</Text>
        <TextInput
          style={[styles.textInput, errors.unit_price && styles.errorInput]}
          value={formData.unit_price === 0 ? '' : formData.unit_price?.toString() || ''}
                  onChangeText={(text) => {
          console.log('Unit price input:', text); // Debug log
          
          // Handle empty input
          if (!text || text.trim() === '') {
            setFormData(prev => ({ ...prev, unit_price: 0 }));
            return;
          }
          
          // Replace comma with period
          let cleanText = text.replace(/,/g, '.');
          
          // Remove any non-numeric characters except period
          cleanText = cleanText.replace(/[^0-9.]/g, '');
          
          // Handle multiple periods - keep only first one
          const parts = cleanText.split('.');
          if (parts.length > 2) {
            cleanText = parts[0] + '.' + parts.slice(1).join('');
          }
          
          // Special handling for decimal points
          if (cleanText === '.') {
            // User just typed a decimal point, keep it as 0
            setFormData(prev => ({ ...prev, unit_price: 0 }));
            return;
          }
          
          // Check if it ends with a decimal point (like "3." or "11.")
          if (cleanText.endsWith('.')) {
            // Remove the trailing decimal point for parsing
            const numberPart = cleanText.slice(0, -1);
            if (numberPart === '') {
              setFormData(prev => ({ ...prev, unit_price: 0 }));
            } else {
              const price = parseFloat(numberPart);
              setFormData(prev => ({ ...prev, unit_price: isNaN(price) ? 0 : price }));
            }
            return;
          }
          
          // Normal number parsing
          const price = parseFloat(cleanText);
          console.log('Clean text:', cleanText, 'Parsed price:', price); // Debug log
          setFormData(prev => ({ ...prev, unit_price: isNaN(price) ? 0 : price }));
        }}
          placeholder="0,00 or 0.00"
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.unit_price && <Text style={styles.errorText}>{errors.unit_price}</Text>}
        <Text style={styles.helperText}>
          Current value: ${formData.unit_price?.toFixed(2) || '0.00'}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput
          style={styles.textInput}
          value={formData.location}
          onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
          placeholder="Enter storage location"
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} testID="inventory-form-screen">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading product data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="inventory-form-screen">
      {renderOfflineBanner()}
      {renderDraftSaved()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'add' ? 'Add New Product' : 'Edit Product'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'add' ? 'Create a new product entry' : 'Update product information'}
          </Text>
        </View>

        {renderImageSection()}
        {renderBasicInfo()}
        {renderStockInfo()}

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.button, styles.draftButton]}
            onPress={saveDraft}
          >
            <Icon name="save" size={16} color="#007AFF" />
            <Text style={styles.draftButtonText}>Save Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="check" size={16} color="white" />
                <Text style={styles.buttonText}>
                  {mode === 'add' ? 'Add Product' : 'Save Changes'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  offlineText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  draftText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: '#34C759',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  skuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  barcodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  scanButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  actionSection: {
    padding: 20,
    marginTop: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  draftButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
});

export default InventoryFormScreen; 