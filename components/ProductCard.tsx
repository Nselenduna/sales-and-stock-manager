import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { Product } from '../lib/supabase';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onQRPress: () => void;
  onEditPress?: () => void;
  canEdit?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onQRPress,
  onEditPress,
  canEdit = false,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);
  const getSyncStatusIcon = (syncStatus: string) => {
    switch (syncStatus) {
      case 'synced':
        return { name: 'checkmark-circle', color: '#34C759' };
      case 'pending':
        return { name: 'time', color: '#FF9500' };
      case 'error':
        return { name: 'alert-circle', color: '#FF3B30' };
      case 'local':
        return { name: 'cloud-upload', color: '#007AFF' };
      default:
        return { name: 'info', color: '#666' };
    }
  };

  const getStockStatusColor = (quantity: number, threshold: number) => {
    if (quantity === 0) return '#FF3B30';
    if (quantity <= threshold) return '#FF9500';
    return '#34C759';
  };

  const syncIcon = getSyncStatusIcon(product.sync_status);
  const stockColor = getStockStatusColor(
    product.quantity,
    product.low_stock_threshold
  );

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`${product.name}, Quantity: ${product.quantity}, SKU: ${product.sku}`}
      accessibilityRole='button'
    >
      <View style={styles.cardHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.productSku}>SKU: {product.sku}</Text>
          {product.location && (
            <Text style={styles.productLocation}>📍 {product.location}</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={onQRPress}
            accessible={true}
            accessibilityLabel={`Scan QR code for ${product.name}`}
            accessibilityRole='button'
          >
            <Icon name='qr-code' size={20} color='#007AFF' />
          </TouchableOpacity>
          <View style={styles.syncStatus}>
            <Icon name={syncIcon.name} size={16} color={syncIcon.color} />
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* Lazy Image Loading */}
        {product.image_url && (
          <View style={styles.imageContainer}>
            {!imageLoaded && !imageError && (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator size='small' color='#007AFF' />
              </View>
            )}
            {!imageError && (
              <Image
                source={{ uri: product.image_url }}
                style={[styles.productImage, { opacity: imageLoaded ? 1 : 0 }]}
                onLoad={handleImageLoad}
                onError={handleImageError}
                accessible={true}
                accessibilityLabel={`Product image for ${product.name}`}
                resizeMode='cover'
              />
            )}
            {imageError && (
              <View style={styles.imagePlaceholder}>
                <Icon name='image' size={24} color='#ccc' />
                <Text style={styles.imageErrorText}>Image unavailable</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.stockInfo}>
          <View
            style={[styles.stockIndicator, { backgroundColor: stockColor }]}
          />
          <Text style={styles.stockQuantity}>{product.quantity} in stock</Text>
          {product.quantity <= product.low_stock_threshold &&
            product.quantity > 0 && (
              <Text style={styles.lowStockWarning}>
                Low stock (≤{product.low_stock_threshold})
              </Text>
            )}
          {product.quantity === 0 && (
            <Text style={styles.outOfStockWarning}>Out of stock</Text>
          )}
        </View>
      </View>

      {canEdit && onEditPress && (
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={onEditPress}
            accessible={true}
            accessibilityLabel={`Edit ${product.name}`}
            accessibilityRole='button'
          >
            <Icon name='edit' size={16} color='#007AFF' />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  productLocation: {
    fontSize: 12,
    color: '#999',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrButton: {
    padding: 8,
    marginRight: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncStatus: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    marginBottom: 12,
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  imageErrorText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  stockQuantity: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  lowStockWarning: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  outOfStockWarning: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '500',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default ProductCard;
