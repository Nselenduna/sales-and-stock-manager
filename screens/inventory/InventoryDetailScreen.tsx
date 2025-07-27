import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import { supabase, Product } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface InventoryDetailScreenProps {
  navigation: any;
  route: {
    params: {
      productId: string;
      mode?: 'view' | 'edit';
    };
  };
}

interface SyncStatus {
  status: 'synced' | 'local' | 'stale' | 'error';
  lastSync?: string;
  error?: string;
}

const InventoryDetailScreen: React.FC<InventoryDetailScreenProps> = ({ navigation, route }) => {
  const { productId, mode = 'view' } = route.params;
  const { userRole } = useAuthStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'synced' });
  const [formData, setFormData] = useState<Partial<Product>>({});

  // Role-based access control
  const canEdit = userRole === 'admin' || userRole === 'staff';
  const canDelete = userRole === 'admin';

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      
      setProduct(data);
      setFormData(data);
      
      // Simulate sync status check
      checkSyncStatus(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const checkSyncStatus = (productData: Product) => {
    // Simulate sync status check - in real app, this would check against local storage
    const lastModified = new Date(productData.updated_at);
    const now = new Date();
    const timeDiff = now.getTime() - lastModified.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 1) {
      setSyncStatus({ status: 'synced', lastSync: productData.updated_at });
    } else if (hoursDiff < 24) {
      setSyncStatus({ status: 'stale', lastSync: productData.updated_at });
    } else {
      setSyncStatus({ status: 'error', lastSync: productData.updated_at, error: 'Data may be outdated' });
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      Alert.alert('Access Denied', 'You do not have permission to edit products');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('products')
        .update(formData)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;

      setProduct(data);
      setIsEditing(false);
      setSyncStatus({ status: 'synced', lastSync: new Date().toISOString() });
      Alert.alert('Success', 'Product updated successfully');
    } catch (error: any) {
      console.error('Error updating product:', error);
      Alert.alert('Error', error.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      Alert.alert('Access Denied', 'Only administrators can delete products');
      return;
    }

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

              if (error) throw error;

              Alert.alert('Success', 'Product deleted successfully');
              navigation.goBack();
            } catch (error: any) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', error.message || 'Failed to delete product');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const renderSyncStatus = () => {
    const getStatusColor = () => {
      switch (syncStatus.status) {
        case 'synced': return '#34C759';
        case 'stale': return '#FF9500';
        case 'error': return '#FF3B30';
        case 'local': return '#007AFF';
        default: return '#8E8E93';
      }
    };

    const getStatusText = () => {
      switch (syncStatus.status) {
        case 'synced': return 'Synced';
        case 'stale': return 'Stale';
        case 'error': return 'Sync Error';
        case 'local': return 'Local Only';
        default: return 'Unknown';
      }
    };

    return (
      <View style={[styles.syncBanner, { backgroundColor: getStatusColor() }]}>
        <Icon name="sync" size={16} color="white" />
        <Text style={styles.syncText}>{getStatusText()}</Text>
        {syncStatus.lastSync && (
          <Text style={styles.syncTime}>
            {new Date(syncStatus.lastSync).toLocaleString()}
          </Text>
        )}
      </View>
    );
  };

  const renderMetadata = () => (
    <View style={styles.metadataSection}>
      <Text style={styles.sectionTitle}>Metadata</Text>
      <View style={styles.metadataItem}>
        <Text style={styles.metadataLabel}>Created:</Text>
        <Text style={styles.metadataValue}>
          {product?.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
        </Text>
      </View>
      <View style={styles.metadataItem}>
        <Text style={styles.metadataLabel}>Last Updated:</Text>
        <Text style={styles.metadataValue}>
          {product?.updated_at ? new Date(product.updated_at).toLocaleDateString() : 'N/A'}
        </Text>
      </View>
      <View style={styles.metadataItem}>
        <Text style={styles.metadataLabel}>Product ID:</Text>
        <Text style={styles.metadataValue}>{product?.id}</Text>
      </View>
    </View>
  );

  const renderProductInfo = () => (
    <View style={styles.productSection}>
      <Text style={styles.sectionTitle}>Product Information</Text>
      
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Name</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={formData.name || ''}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Product name"
          />
        ) : (
          <Text style={styles.fieldValue}>{product?.name}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>SKU</Text>
        <Text style={styles.fieldValue}>{product?.sku}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Barcode</Text>
        <Text style={styles.fieldValue}>{product?.barcode || 'Not set'}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Category</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={formData.category || ''}
            onChangeText={(text) => setFormData({ ...formData, category: text })}
            placeholder="Category"
          />
        ) : (
          <Text style={styles.fieldValue}>{product?.category || 'Uncategorized'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Description</Text>
        {isEditing ? (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.description || ''}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Product description"
            multiline
            numberOfLines={3}
          />
        ) : (
          <Text style={styles.fieldValue}>{product?.description || 'No description'}</Text>
        )}
      </View>
    </View>
  );

  const renderStockInfo = () => (
    <View style={styles.stockSection}>
      <Text style={styles.sectionTitle}>Stock Information</Text>
      
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Quantity</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={formData.quantity?.toString() || '0'}
            onChangeText={(text) => setFormData({ ...formData, quantity: parseInt(text) || 0 })}
            placeholder="0"
            keyboardType="numeric"
          />
        ) : (
          <Text style={[styles.fieldValue, { color: product?.quantity === 0 ? '#FF3B30' : '#34C759' }]}>
            {product?.quantity}
          </Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Low Stock Threshold</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={formData.low_stock_threshold?.toString() || '10'}
            onChangeText={(text) => setFormData({ ...formData, low_stock_threshold: parseInt(text) || 10 })}
            placeholder="10"
            keyboardType="numeric"
          />
        ) : (
          <Text style={styles.fieldValue}>{product?.low_stock_threshold}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Unit Price</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={formData.unit_price?.toString() || '0'}
            onChangeText={(text) => setFormData({ ...formData, unit_price: parseFloat(text) || 0 })}
            placeholder="0.00"
            keyboardType="numeric"
          />
        ) : (
          <Text style={styles.fieldValue}>${product?.unit_price?.toFixed(2) || '0.00'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Location</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={formData.location || ''}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="Storage location"
          />
        ) : (
          <Text style={styles.fieldValue}>{product?.location || 'Not specified'}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderSyncStatus()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.subtitle}>SKU: {product.sku}</Text>
          </View>
          
          {canEdit && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
              disabled={saving}
            >
              <Icon name={isEditing ? "close" : "edit"} size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        {renderProductInfo()}
        {renderStockInfo()}
        {renderMetadata()}

        {isEditing && canEdit && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {canDelete && !isEditing && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDelete}
              disabled={saving}
            >
              <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  syncText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  syncTime: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
    marginLeft: 'auto',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flex: 1,
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
  editButton: {
    padding: 8,
  },
  productSection: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 20,
  },
  stockSection: {
    backgroundColor: 'white',
    marginTop: 1,
    padding: 20,
  },
  metadataSection: {
    backgroundColor: 'white',
    marginTop: 1,
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
  fieldValue: {
    fontSize: 16,
    color: '#1C1C1E',
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
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  metadataValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  actionSection: {
    padding: 20,
    marginTop: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  deleteButtonText: {
    color: '#FF3B30',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 24,
  },
});

export default InventoryDetailScreen; 