import { Product } from '../supabase';

export interface ConflictResolution {
  mergedProduct: Product;
  hasConflicts: boolean;
  conflictingFields: string[];
  resolutionType: 'auto-merge' | 'user-resolution' | 'no-conflict';
}

export interface ConflictMetadata {
  productId: string;
  conflictingFields: string[];
  localChanges: Partial<Product>;
  remoteChanges: Partial<Product>;
  timestamp: string;
  resolutionType: 'auto-merge' | 'user-resolution';
  resolvedBy?: string;
}

/**
 * Safely merge local and remote product changes
 * @param localProduct - Current local state
 * @param remoteProduct - Current remote state from Supabase
 * @param lastSyncedAt - Timestamp of last successful sync
 * @returns ConflictResolution with merged result and conflict info
 */
export function mergeProductChanges(
  localProduct: Product,
  remoteProduct: Product,
  lastSyncedAt: string
): ConflictResolution {
  const conflictingFields: string[] = [];
  const mergedProduct = { ...localProduct };

  // Check if remote has been updated since last sync
  const remoteUpdatedAt = new Date(remoteProduct.updated_at);
  const lastSync = new Date(lastSyncedAt);

  if (remoteUpdatedAt <= lastSync) {
    // No conflicts - remote hasn't changed since last sync
    return {
      mergedProduct: localProduct,
      hasConflicts: false,
      conflictingFields: [],
      resolutionType: 'no-conflict',
    };
  }

  // Compare fields that might conflict
  const fieldsToCheck: (keyof Product)[] = [
    'name',
    'sku',
    'price',
    'quantity',
    'description',
    'location',
    'low_stock_threshold',
    'barcode',
  ];

  for (const field of fieldsToCheck) {
    const localValue = localProduct[field];
    const remoteValue = remoteProduct[field];

    // Check if both local and remote have different values
    if (
      localValue !== remoteValue &&
      localValue !== undefined &&
      remoteValue !== undefined
    ) {
      conflictingFields.push(field);

      // Auto-merge strategy: prefer local changes for most fields
      // but be conservative with critical fields
      if (field === 'sku' || field === 'barcode') {
        // For unique identifiers, prefer remote (more authoritative)
        mergedProduct[field] = remoteValue;
      } else if (field === 'quantity') {
        // For quantity, use the higher value (safer)
        mergedProduct[field] = Math.max(
          Number(localValue) || 0,
          Number(remoteValue) || 0
        );
      } else {
        // For other fields, prefer local changes
        mergedProduct[field] = localValue;
      }
    }
  }

  // Update the merged product's timestamp
  mergedProduct.updated_at = new Date().toISOString();
  mergedProduct.last_synced_at = new Date().toISOString();

  return {
    mergedProduct,
    hasConflicts: conflictingFields.length > 0,
    conflictingFields,
    resolutionType: conflictingFields.length > 0 ? 'auto-merge' : 'no-conflict',
  };
}

/**
 * Log conflict resolution for audit trail
 * @param metadata - Conflict resolution metadata
 */
export async function logConflictResolution(
  metadata: ConflictMetadata
): Promise<void> {
  try {
    // Log to Supabase audit table
    const { supabase } = await import('../supabase');

    await supabase.from('sync_conflicts').insert({
      product_id: metadata.productId,
      conflicting_fields: metadata.conflictingFields,
      local_changes: metadata.localChanges,
      remote_changes: metadata.remoteChanges,
      resolved_at: metadata.timestamp,
      resolution_type: metadata.resolutionType,
      resolved_by: metadata.resolvedBy || 'system',
    });
  } catch (error) {
    console.error('Failed to log conflict resolution:', error);
    // Don't throw - conflict logging shouldn't break sync
  }
}

/**
 * Create conflict metadata for logging
 * @param productId - Product ID
 * @param localProduct - Local product state
 * @param remoteProduct - Remote product state
 * @param conflictingFields - Fields that conflicted
 * @param resolutionType - How conflict was resolved
 * @param resolvedBy - Who resolved the conflict
 * @returns ConflictMetadata object
 */
export function createConflictMetadata(
  productId: string,
  localProduct: Product,
  remoteProduct: Product,
  conflictingFields: string[],
  resolutionType: 'auto-merge' | 'user-resolution',
  resolvedBy?: string
): ConflictMetadata {
  const localChanges: Partial<Product> = {};
  const remoteChanges: Partial<Product> = {};

  // Extract only the conflicting fields
  for (const field of conflictingFields) {
    localChanges[field as keyof Product] = localProduct[field as keyof Product];
    remoteChanges[field as keyof Product] =
      remoteProduct[field as keyof Product];
  }

  return {
    productId,
    conflictingFields,
    localChanges,
    remoteChanges,
    timestamp: new Date().toISOString(),
    resolutionType,
    resolvedBy,
  };
}
