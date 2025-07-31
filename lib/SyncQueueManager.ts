import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { v4 as uuid } from 'uuid';
import NetInfo from '@react-native-community/netinfo';

/**
 * Type of operation to be performed
 */
export type SyncOperation = 'create' | 'update' | 'delete';

/**
 * Entity types that can be synced
 */
export type SyncEntity = 'products' | 'sales';

/**
 * Status of a sync queue item
 */
export type SyncStatus = 'pending' | 'processing' | 'failed' | 'completed';

/**
 * Interface for a sync queue item
 */
export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  entity: SyncEntity;
  data: any;
  timestamp: number;
  retryCount: number;
  status: SyncStatus;
  errorMessage?: string;
  version?: number;
  lastAttempt?: number;
}

/**
 * Options for adding an item to the sync queue
 */
export interface AddToQueueOptions {
  operation: SyncOperation;
  entity: SyncEntity;
  data: any;
  version?: number;
}

/**
 * Interface for sync queue events
 */
export interface SyncQueueEvents {
  onSyncStart?: () => void;
  onSyncComplete?: (results: { success: number; failed: number }) => void;
  onItemProcessed?: (item: SyncQueueItem, success: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Manager for handling offline data synchronization
 */
export class SyncQueueManager {
  private queue: SyncQueueItem[] = [];
  private isProcessing = false;
  private storage: 'async-storage' | 'sqlite' = 'async-storage';
  private db: SQLite.SQLiteDatabase | null = null;
  private events: SyncQueueEvents = {};
  private static instance: SyncQueueManager;

  /**
   * Get singleton instance of SyncQueueManager
   */
  public static getInstance(): SyncQueueManager {
    if (!SyncQueueManager.instance) {
      SyncQueueManager.instance = new SyncQueueManager();
    }
    return SyncQueueManager.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize storage based on platform
    if (Platform.OS !== 'web' && SQLite.openDatabase) {
      try {
        this.db = SQLite.openDatabase('syncQueue.db');
        this.storage = 'sqlite';
        this.initializeDatabase();
      } catch (error) {
        console.error(
          'Failed to open SQLite database, falling back to AsyncStorage',
          error
        );
        this.storage = 'async-storage';
      }
    }

    // Load queue from persistent storage
    this.loadQueue();

    // Set up network change listener
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing && this.queue.length > 0) {
        this.processQueue();
      }
    });
  }

  /**
   * Initialize SQLite database tables if needed
   */
  private async initializeDatabase(): Promise<void> {
    if (!this.db) return;

    return new Promise<void>((resolve, reject) => {
      this.db?.transaction(tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            operation TEXT NOT NULL,
            entity TEXT NOT NULL,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            retryCount INTEGER NOT NULL,
            status TEXT NOT NULL,
            errorMessage TEXT,
            version INTEGER,
            lastAttempt INTEGER
          )`,
          [],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Register event handlers
   */
  public registerEvents(events: SyncQueueEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * Load queue from persistent storage
   */
  public async loadQueue(): Promise<void> {
    try {
      if (this.storage === 'sqlite' && this.db) {
        return new Promise<void>((resolve, reject) => {
          this.db?.transaction(tx => {
            tx.executeSql(
              'SELECT * FROM sync_queue WHERE status != ?',
              ['completed'],
              (_, result) => {
                const items: SyncQueueItem[] = [];
                for (let i = 0; i < result.rows.length; i++) {
                  const row = result.rows.item(i);
                  items.push({
                    ...row,
                    data: JSON.parse(row.data),
                  });
                }
                this.queue = items;
                resolve();
              },
              (_, error) => {
                reject(error);
                return false;
              }
            );
          });
        });
      } else {
        // Use AsyncStorage
        const queueData = await AsyncStorage.getItem('sync_queue');
        if (queueData) {
          this.queue = JSON.parse(queueData);
        }
      }
    } catch (error) {
      console.error('Failed to load sync queue', error);
      this.events.onError?.(new Error('Failed to load sync queue'));
    }
  }

  /**
   * Add an item to the sync queue
   */
  public async addToQueue(options: AddToQueueOptions): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: uuid(),
      operation: options.operation,
      entity: options.entity,
      data: options.data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      version: options.version || Date.now(),
    };

    this.queue.push(item);
    await this.persistQueue();

    // Try to process queue if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected && !this.isProcessing) {
      this.processQueue();
    }

    return item;
  }

  /**
   * Process all pending items in the queue
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    // Check network connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    this.isProcessing = true;
    this.events.onSyncStart?.();

    let successCount = 0;
    let failedCount = 0;

    // Process pending items
    const pendingItems = this.queue.filter(
      item =>
        item.status === 'pending' ||
        (item.status === 'failed' && item.retryCount < 3)
    );

    for (const item of pendingItems) {
      try {
        // Mark as processing
        item.status = 'processing';
        item.lastAttempt = Date.now();
        await this.persistQueue();

        // Process the item
        await this.processItem(item);

        // Mark as completed
        item.status = 'completed';
        successCount++;
        this.events.onItemProcessed?.(item, true);
      } catch (error) {
        // Mark as failed
        item.retryCount++;
        item.status = item.retryCount >= 3 ? 'failed' : 'pending';
        item.errorMessage =
          error instanceof Error ? error.message : String(error);
        failedCount++;
        this.events.onItemProcessed?.(item, false);
      }

      // Persist after each item
      await this.persistQueue();
    }

    // Clean up completed items (keep last 100)
    await this.cleanupCompletedItems();

    this.isProcessing = false;
    this.events.onSyncComplete?.({
      success: successCount,
      failed: failedCount,
    });
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        await this.handleCreate(item);
        break;
      case 'update':
        await this.handleUpdate(item);
        break;
      case 'delete':
        await this.handleDelete(item);
        break;
      default:
        throw new Error(`Unknown operation: ${item.operation}`);
    }
  }

  /**
   * Handle create operation
   */
  private async handleCreate(item: SyncQueueItem): Promise<void> {
    const { data, error } = await supabase
      .from(item.entity)
      .insert(item.data)
      .select();

    if (error) throw error;

    // Update local data with server-generated values
    if (data && data[0]) {
      item.data = { ...item.data, ...data[0] };
    }
  }

  /**
   * Handle update operation
   */
  private async handleUpdate(item: SyncQueueItem): Promise<void> {
    // Check for conflicts if version is available
    if (item.version) {
      const { data: existingData, error: checkError } = await supabase
        .from(item.entity)
        .select('updated_at')
        .eq('id', item.data.id)
        .single();

      if (checkError) throw checkError;

      if (existingData) {
        const serverTimestamp = new Date(existingData.updated_at).getTime();
        if (serverTimestamp > item.version) {
          throw new Error('Conflict detected: Server has newer version');
        }
      }
    }

    const { error } = await supabase
      .from(item.entity)
      .update(item.data)
      .eq('id', item.data.id);

    if (error) throw error;
  }

  /**
   * Handle delete operation
   */
  private async handleDelete(item: SyncQueueItem): Promise<void> {
    const { error } = await supabase
      .from(item.entity)
      .delete()
      .eq('id', item.data.id);

    if (error) throw error;
  }

  /**
   * Remove an item from the queue
   */
  public async removeFromQueue(id: string): Promise<void> {
    this.queue = this.queue.filter(item => item.id !== id);
    await this.persistQueue();
  }

  /**
   * Mark an item as failed
   */
  public async markAsFailed(item: SyncQueueItem, error: Error): Promise<void> {
    const queueItem = this.queue.find(i => i.id === item.id);
    if (queueItem) {
      queueItem.status = 'failed';
      queueItem.errorMessage = error.message;
      queueItem.lastAttempt = Date.now();
      await this.persistQueue();
    }
  }

  /**
   * Persist queue to storage
   */
  public async persistQueue(): Promise<void> {
    try {
      if (this.storage === 'sqlite' && this.db) {
        return new Promise<void>((resolve, reject) => {
          this.db?.transaction(tx => {
            // First delete all items
            tx.executeSql(
              'DELETE FROM sync_queue',
              [],
              () => {
                // Then insert all current items
                for (const item of this.queue) {
                  const {
                    id,
                    operation,
                    entity,
                    timestamp,
                    retryCount,
                    status,
                    errorMessage,
                    version,
                    lastAttempt,
                  } = item;
                  const data = JSON.stringify(item.data);

                  tx.executeSql(
                    `INSERT INTO sync_queue (
                      id, operation, entity, data, timestamp, retryCount, 
                      status, errorMessage, version, lastAttempt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      id,
                      operation,
                      entity,
                      data,
                      timestamp,
                      retryCount,
                      status,
                      errorMessage,
                      version,
                      lastAttempt,
                    ]
                  );
                }
                resolve();
              },
              (_, error) => {
                reject(error);
                return false;
              }
            );
          });
        });
      } else {
        // Use AsyncStorage
        await AsyncStorage.setItem('sync_queue', JSON.stringify(this.queue));
      }
    } catch (error) {
      console.error('Failed to persist sync queue', error);
      this.events.onError?.(new Error('Failed to persist sync queue'));
    }
  }

  /**
   * Clean up completed items, keeping only the most recent ones
   */
  private async cleanupCompletedItems(): Promise<void> {
    // Get completed items
    const completed = this.queue.filter(item => item.status === 'completed');

    // If we have more than 100 completed items, remove the oldest ones
    if (completed.length > 100) {
      // Sort by timestamp (newest first)
      completed.sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the 100 most recent
      const toKeep = completed.slice(0, 100).map(item => item.id);

      // Remove old completed items from queue
      this.queue = this.queue.filter(
        item => item.status !== 'completed' || toKeep.includes(item.id)
      );

      // Persist the updated queue
      await this.persistQueue();
    }
  }

  /**
   * Get all items in the queue
   */
  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get pending items count
   */
  public getPendingCount(): number {
    return this.queue.filter(item => item.status === 'pending').length;
  }

  /**
   * Get failed items count
   */
  public getFailedCount(): number {
    return this.queue.filter(item => item.status === 'failed').length;
  }

  /**
   * Check if the queue is currently processing
   */
  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Retry failed items
   */
  public async retryFailedItems(): Promise<void> {
    // Reset retry count for failed items
    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retryCount = 0;
      }
    });

    await this.persistQueue();

    // Try to process queue if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected && !this.isProcessing) {
      this.processQueue();
    }
  }
}
