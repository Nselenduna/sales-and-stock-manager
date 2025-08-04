/**
 * Conflict Resolution Helper
 * 
 * Handles data conflicts during offline sync operations
 * for the Sales and Stock Manager application.
 */

import { Product, SalesTransaction } from './supabase';
import { errorHandler } from './errorHandler';

export type ConflictType = 'DATA_MODIFIED' | 'DATA_DELETED' | 'SCHEMA_MISMATCH' | 'DUPLICATE_KEY';

export type ResolutionStrategy = 'USE_LOCAL' | 'USE_REMOTE' | 'MERGE' | 'MANUAL';

export interface ConflictData<T = unknown> {
  type: ConflictType;
  localData: T;
  remoteData: T;
  baseData?: T; // Original data before changes
  conflictFields: string[];
  timestamp: string;
  strategy?: ResolutionStrategy;
}

export interface ConflictResolution<T = unknown> {
  strategy: ResolutionStrategy;
  resolvedData: T;
  metadata?: Record<string, unknown>;
}

export interface ConflictResolverOptions {
  defaultStrategy?: ResolutionStrategy;
  autoResolveRules?: Record<string, ResolutionStrategy>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mergeRules?: Record<string, (local: unknown, remote: unknown, base?: unknown) => unknown>;
}

class ConflictResolver {
  private options: ConflictResolverOptions;
  private pendingConflicts: Map<string, ConflictData> = new Map();

  constructor(options: ConflictResolverOptions = {}) {
    this.options = {
      defaultStrategy: 'MANUAL' as ResolutionStrategy,
      autoResolveRules: {},
      mergeRules: {},
      ...options,
    };
  }

  /**
   * Detect conflicts between local and remote data
   */
  public detectConflict<T extends Record<string, unknown>>(
    localData: T,
    remoteData: T,
    baseData?: T
  ): ConflictData<T> | null {
    const conflictFields: string[] = [];
    
    // Compare all fields
    const allFields = new Set([
      ...Object.keys(localData),
      ...Object.keys(remoteData),
    ]);

    for (const field of allFields) {
      if (this.hasFieldConflict(localData[field], remoteData[field], baseData?.[field])) {
        conflictFields.push(field);
      }
    }

    if (conflictFields.length === 0) {
      return null; // No conflict
    }

    // Determine conflict type
    const type = this.determineConflictType(localData, remoteData, conflictFields);

    return {
      type,
      localData,
      remoteData,
      baseData,
      conflictFields,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resolve a conflict using specified strategy
   */
  public resolveConflict<T>(
    conflict: ConflictData<T>,
    strategy?: ResolutionStrategy
  ): ConflictResolution<T> {
    const resolveStrategy = strategy || 
      this.options.autoResolveRules?.[conflict.type] || 
      this.options.defaultStrategy;

    try {
      switch (resolveStrategy) {
        case 'USE_LOCAL':
          return this.resolveUseLocal(conflict);
        
        case 'USE_REMOTE':
          return this.resolveUseRemote(conflict);
        
        case 'MERGE':
          return this.resolveMerge(conflict);
        
        case 'MANUAL':
        default:
          return this.resolveManual(conflict);
      }
    } catch (error) {
      errorHandler.handle(
        errorHandler.createSyncError(
          `Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { component: 'ConflictResolver', action: 'resolveConflict' },
          error instanceof Error ? error : undefined
        )
      );
      
      // Fallback to manual resolution
      return this.resolveManual(conflict);
    }
  }

  /**
   * Resolve product conflicts with business logic
   */
  public resolveProductConflict(
    conflict: ConflictData<Product>,
    strategy?: ResolutionStrategy
  ): ConflictResolution<Product> {
    if (strategy === 'MERGE') {
      return this.mergeProducts(conflict);
    }
    
    return this.resolveConflict(conflict, strategy);
  }

  /**
   * Resolve sales transaction conflicts
   */
  public resolveSalesConflict(
    conflict: ConflictData<SalesTransaction>,
    strategy?: ResolutionStrategy
  ): ConflictResolution<SalesTransaction> {
    // Sales transactions should generally not be merged
    // Prefer local data for completed transactions
    if (conflict.localData.status === 'completed') {
      return this.resolveUseLocal(conflict);
    }
    
    return this.resolveConflict(conflict, strategy);
  }

  /**
   * Add a pending conflict for manual resolution
   */
  public addPendingConflict(id: string, conflict: ConflictData): void {
    this.pendingConflicts.set(id, conflict);
  }

  /**
   * Get all pending conflicts
   */
  public getPendingConflicts(): Map<string, ConflictData> {
    return new Map(this.pendingConflicts);
  }

  /**
   * Remove a resolved conflict
   */
  public removePendingConflict(id: string): boolean {
    return this.pendingConflicts.delete(id);
  }

  /**
   * Clear all pending conflicts
   */
  public clearPendingConflicts(): void {
    this.pendingConflicts.clear();
  }

  /**
   * Get conflict statistics
   */
  public getConflictStats(): Record<ConflictType, number> {
    const stats = {
      'DATA_MODIFIED': 0,
      'DATA_DELETED': 0,
      'SCHEMA_MISMATCH': 0,
      'DUPLICATE_KEY': 0,
    } as Record<ConflictType, number>;

    for (const conflict of this.pendingConflicts.values()) {
      stats[conflict.type]++;
    }

    return stats;
  }

  private hasFieldConflict(local: unknown, remote: unknown, base?: unknown): boolean {
    // If we have base data, check if both local and remote changed from base
    if (base !== undefined) {
      const localChanged = !this.deepEqual(local, base);
      const remoteChanged = !this.deepEqual(remote, base);
      return localChanged && remoteChanged && !this.deepEqual(local, remote);
    }
    
    // Without base data, just compare local vs remote
    return !this.deepEqual(local, remote);
  }

  private determineConflictType<T>(
    localData: T,
    remoteData: T,
    conflictFields: string[]
  ): ConflictType {
    // Check for schema mismatches
    const localKeys = Object.keys(localData as Record<string, unknown>);
    const remoteKeys = Object.keys(remoteData as Record<string, unknown>);
    
    if (localKeys.length !== remoteKeys.length) {
      return 'SCHEMA_MISMATCH';
    }

    // Check for key conflicts (like duplicate IDs)
    if (conflictFields.includes('id') || conflictFields.includes('sku')) {
      return 'DUPLICATE_KEY';
    }

    // Default to data modification conflict
    return 'DATA_MODIFIED';
  }

  private resolveUseLocal<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    return {
      strategy: 'USE_LOCAL' as ResolutionStrategy,
      resolvedData: conflict.localData,
      metadata: {
        timestamp: new Date().toISOString(),
        conflictFields: conflict.conflictFields,
      },
    };
  }

  private resolveUseRemote<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    return {
      strategy: 'USE_REMOTE' as ResolutionStrategy,
      resolvedData: conflict.remoteData,
      metadata: {
        timestamp: new Date().toISOString(),
        conflictFields: conflict.conflictFields,
      },
    };
  }

  private resolveMerge<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    const merged = { ...conflict.remoteData };

    // Apply custom merge rules
    for (const field of conflict.conflictFields) {
      const mergeRule = this.options.mergeRules?.[field];
      if (mergeRule) {
        (merged as Record<string, unknown>)[field] = mergeRule(
          (conflict.localData as Record<string, unknown>)[field],
          (conflict.remoteData as Record<string, unknown>)[field],
          conflict.baseData ? (conflict.baseData as Record<string, unknown>)[field] : undefined
        );
      } else {
        // Default merge logic: prefer local changes
        (merged as Record<string, unknown>)[field] = (conflict.localData as Record<string, unknown>)[field];
      }
    }

    return {
      strategy: 'MERGE' as ResolutionStrategy,
      resolvedData: merged,
      metadata: {
        timestamp: new Date().toISOString(),
        conflictFields: conflict.conflictFields,
        mergedFields: conflict.conflictFields,
      },
    };
  }

  private resolveManual<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    // For manual resolution, return local data as default
    // The actual manual resolution should be handled by UI
    return {
      strategy: 'MANUAL' as ResolutionStrategy,
      resolvedData: conflict.localData,
      metadata: {
        timestamp: new Date().toISOString(),
        conflictFields: conflict.conflictFields,
        requiresManualResolution: true,
      },
    };
  }

  private mergeProducts(conflict: ConflictData<Product>): ConflictResolution<Product> {
    const local = conflict.localData;
    const remote = conflict.remoteData;
    
    // Custom product merge logic
    const merged: Product = {
      ...remote, // Start with remote as base
      // Prefer local quantity changes (inventory updates)
      quantity: local.quantity,
      // Take the more recent update timestamp
      updated_at: new Date(local.updated_at) > new Date(remote.updated_at) 
        ? local.updated_at 
        : remote.updated_at,
    };

    // Handle specific field conflicts
    for (const field of conflict.conflictFields) {
      switch (field) {
        case 'name':
        case 'description':
          // Prefer longer, more descriptive content
          if ((local[field] as string)?.length > (remote[field] as string)?.length) {
            (merged as Record<string, unknown>)[field] = local[field];
          }
          break;
        
        case 'unit_price':
          // Prefer non-zero prices
          if (local.unit_price && local.unit_price > 0) {
            merged.unit_price = local.unit_price;
          }
          break;
        
        case 'low_stock_threshold':
          // Prefer lower thresholds (more conservative)
          if (local.low_stock_threshold < remote.low_stock_threshold) {
            merged.low_stock_threshold = local.low_stock_threshold;
          }
          break;
      }
    }

    return {
      strategy: 'MERGE' as ResolutionStrategy,
      resolvedData: merged,
      metadata: {
        timestamp: new Date().toISOString(),
        conflictFields: conflict.conflictFields,
        productMergeRules: 'applied',
      },
    };
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    
    if (a == null || b == null) return a === b;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }
    
    return true;
  }
}

// Export default resolver instance with sensible defaults
export const conflictResolver = new ConflictResolver({
  defaultStrategy: 'MERGE' as ResolutionStrategy,
  autoResolveRules: {
    'DATA_MODIFIED': 'MERGE' as ResolutionStrategy,
    'DUPLICATE_KEY': 'MANUAL' as ResolutionStrategy,
    'SCHEMA_MISMATCH': 'MANUAL' as ResolutionStrategy,
  },
  mergeRules: {
    // Quantity: prefer local (recent inventory updates)
    quantity: (local) => local,
    // Timestamps: prefer more recent
    updated_at: (local, remote) => 
      new Date(local as string) > new Date(remote as string) ? local : remote,
    // Prices: prefer non-zero values
    unit_price: (local, remote) => 
      (local && (local as number) > 0) ? local : remote,
  },
});

// Export convenience functions
export const detectConflict = <T extends Record<string, unknown>>(
  localData: T,
  remoteData: T,
  baseData?: T
) => conflictResolver.detectConflict(localData, remoteData, baseData);

export const resolveConflict = <T>(
  conflict: ConflictData<T>,
  strategy?: ResolutionStrategy
) => conflictResolver.resolveConflict(conflict, strategy);

export const resolveProductConflict = (
  conflict: ConflictData<Product>,
  strategy?: ResolutionStrategy
) => conflictResolver.resolveProductConflict(conflict, strategy);

export const resolveSalesConflict = (
  conflict: ConflictData<SalesTransaction>,
  strategy?: ResolutionStrategy
) => conflictResolver.resolveSalesConflict(conflict, strategy);