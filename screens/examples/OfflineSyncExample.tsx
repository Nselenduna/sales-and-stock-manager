import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SyncQueueManager, SyncQueueItem } from '../../lib/SyncQueueManager';
import { Product } from '../../lib/supabase';
import NetInfo from '@react-native-community/netinfo';

/**
 * Example screen demonstrating the SyncQueueManager for offline-first operations
 */
const OfflineSyncExample: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get the singleton instance of SyncQueueManager
  const syncManager = SyncQueueManager.getInstance();

  // Load queue data and register event handlers
  useEffect(() => {
    // Check network status
    NetInfo.fetch().then(state => {
      setIsOnline(!!state.isConnected);
    });

    // Set up network change listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });

    // Register event handlers
    syncManager.registerEvents({
      onSyncStart: () => {
        setIsProcessing(true);
      },
      onSyncComplete: results => {
        setIsProcessing(false);
        refreshQueueData();

        if (results.success > 0 || results.failed > 0) {
          Alert.alert(
            'Sync Complete',
            `Successfully synced ${results.success} items. Failed to sync ${results.failed} items.`
          );
        }
      },
      onItemProcessed: (item, success) => {
        console.log(`Item ${item.id} processed. Success: ${success}`);
      },
      onError: error => {
        Alert.alert('Sync Error', error.message);
      },
    });

    // Initial data load
    refreshQueueData();

    return () => {
      unsubscribe();
    };
  }, []);

  // Refresh queue data
  const refreshQueueData = useCallback(() => {
    setQueueItems(syncManager.getQueue());
    setPendingCount(syncManager.getPendingCount());
    setFailedCount(syncManager.getFailedCount());
    setIsProcessing(syncManager.isCurrentlyProcessing());
  }, [syncManager]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshQueueData();
    setRefreshing(false);
  }, [refreshQueueData]);

  // Add a product to the queue (create operation)
  const handleAddProduct = useCallback(async () => {
    try {
      // Create a new product with dummy data
      const newProduct: Partial<Product> = {
        name: `Product ${Date.now().toString().slice(-4)}`,
        sku: `SKU${Date.now().toString().slice(-6)}`,
        quantity: Math.floor(Math.random() * 100),
        low_stock_threshold: 10,
        unit_price: parseFloat((Math.random() * 100).toFixed(2)),
        category: 'Example',
        description: 'Created while offline',
      };

      // Add to queue
      await syncManager.addToQueue({
        operation: 'create',
        entity: 'products',
        data: newProduct,
      });

      // Refresh queue data
      refreshQueueData();
      Alert.alert('Success', 'Product added to sync queue');
    } catch (error) {
      Alert.alert('Error', 'Failed to add product to queue');
    }
  }, [syncManager, refreshQueueData]);

  // Update a product in the queue (update operation)
  const handleUpdateProduct = useCallback(async () => {
    try {
      // In a real app, you would select an actual product
      // For this example, we'll create a dummy update
      const productUpdate = {
        id: `dummy-${Date.now()}`, // In real app, use actual ID
        name: `Updated Product ${Date.now().toString().slice(-4)}`,
        quantity: Math.floor(Math.random() * 100),
        updated_at: new Date().toISOString(),
      };

      // Add to queue
      await syncManager.addToQueue({
        operation: 'update',
        entity: 'products',
        data: productUpdate,
        version: Date.now(), // Used for conflict detection
      });

      // Refresh queue data
      refreshQueueData();
      Alert.alert('Success', 'Product update added to sync queue');
    } catch (error) {
      Alert.alert('Error', 'Failed to add update to queue');
    }
  }, [syncManager, refreshQueueData]);

  // Delete a product in the queue (delete operation)
  const handleDeleteProduct = useCallback(async () => {
    try {
      // In a real app, you would select an actual product
      // For this example, we'll create a dummy delete
      const productDelete = {
        id: `dummy-${Date.now()}`, // In real app, use actual ID
      };

      // Add to queue
      await syncManager.addToQueue({
        operation: 'delete',
        entity: 'products',
        data: productDelete,
      });

      // Refresh queue data
      refreshQueueData();
      Alert.alert('Success', 'Product deletion added to sync queue');
    } catch (error) {
      Alert.alert('Error', 'Failed to add deletion to queue');
    }
  }, [syncManager, refreshQueueData]);

  // Process the queue manually
  const handleProcessQueue = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot process queue while offline');
      return;
    }

    try {
      await syncManager.processQueue();
      // The event handlers will update the UI
    } catch (error) {
      Alert.alert('Error', 'Failed to process queue');
    }
  }, [syncManager, isOnline]);

  // Retry failed items
  const handleRetryFailed = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot retry failed items while offline');
      return;
    }

    try {
      await syncManager.retryFailedItems();
      // The event handlers will update the UI
    } catch (error) {
      Alert.alert('Error', 'Failed to retry items');
    }
  }, [syncManager, isOnline]);

  // Remove an item from the queue
  const handleRemoveItem = useCallback(
    async (id: string) => {
      try {
        await syncManager.removeFromQueue(id);
        refreshQueueData();
      } catch (error) {
        Alert.alert('Error', 'Failed to remove item from queue');
      }
    },
    [syncManager, refreshQueueData]
  );

  // Render a queue item
  const renderQueueItem = useCallback(
    ({ item }: { item: SyncQueueItem }) => {
      const getStatusColor = () => {
        switch (item.status) {
          case 'pending':
            return '#FFA500'; // Orange
          case 'processing':
            return '#1E90FF'; // Blue
          case 'completed':
            return '#32CD32'; // Green
          case 'failed':
            return '#FF0000'; // Red
          default:
            return '#808080'; // Gray
        }
      };

      return (
        <View style={styles.queueItem}>
          <View style={styles.queueItemHeader}>
            <View
              style={[styles.statusDot, { backgroundColor: getStatusColor() }]}
            />
            <Text style={styles.queueItemTitle}>
              {item.operation.toUpperCase()} {item.entity}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveItem(item.id)}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.queueItemDetails}>
            <Text style={styles.queueItemId}>ID: {item.id.slice(0, 8)}...</Text>
            <Text>Status: {item.status}</Text>
            {item.retryCount > 0 && <Text>Retries: {item.retryCount}/3</Text>}
            {item.errorMessage && (
              <Text style={styles.errorMessage}>
                Error: {item.errorMessage}
              </Text>
            )}
          </View>

          <View style={styles.queueItemData}>
            <Text style={styles.queueItemDataTitle}>Data:</Text>
            <ScrollView style={styles.dataScrollView}>
              <Text style={styles.dataText}>
                {JSON.stringify(item.data, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      );
    },
    [handleRemoveItem]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offline Sync Manager</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.onlineIndicator,
              { backgroundColor: isOnline ? '#32CD32' : '#FF0000' },
            ]}
          />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{failedCount}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{queueItems.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddProduct}
        >
          <Text style={styles.actionButtonText}>Add Product</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleUpdateProduct}
        >
          <Text style={styles.actionButtonText}>Update Product</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDeleteProduct}
        >
          <Text style={styles.actionButtonText}>Delete Product</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.syncActionsContainer}>
        <TouchableOpacity
          style={[
            styles.syncButton,
            (!isOnline || isProcessing) && styles.disabledButton,
          ]}
          onPress={handleProcessQueue}
          disabled={!isOnline || isProcessing}
        >
          <Text style={styles.syncButtonText}>
            {isProcessing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.retryButton,
            (!isOnline || failedCount === 0) && styles.disabledButton,
          ]}
          onPress={handleRetryFailed}
          disabled={!isOnline || failedCount === 0}
        >
          <Text style={styles.retryButtonText}>Retry Failed</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.queueContainer}>
        <Text style={styles.queueTitle}>Sync Queue</Text>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size='large' color='#007AFF' />
            <Text style={styles.processingText}>Processing Queue...</Text>
          </View>
        )}

        <FlatList
          data={queueItems}
          renderItem={renderQueueItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.queueList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No items in queue. Add some operations while offline.
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'white',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 13,
  },
  syncActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    marginTop: 1,
  },
  syncButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 5,
    alignItems: 'center',
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  queueContainer: {
    flex: 1,
    marginTop: 10,
    backgroundColor: 'white',
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  queueList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  queueItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  queueItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  queueItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  queueItemDetails: {
    marginBottom: 10,
  },
  queueItemId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  errorMessage: {
    color: 'red',
    marginTop: 5,
  },
  queueItemData: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
  },
  queueItemDataTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  dataScrollView: {
    maxHeight: 100,
  },
  dataText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#007AFF',
  },
});

export default OfflineSyncExample;
