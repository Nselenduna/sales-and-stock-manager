-- Rollback for Migration: 002_add_product_metadata
-- Description: Remove metadata fields added to products table
-- Author: Database Migration System
-- Created: 2025-01-04

BEGIN;

-- Drop the views first
DROP VIEW IF EXISTS v_expiring_products;

-- Restore the original low stock view
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT 
    id,
    name,
    sku,
    quantity,
    low_stock_threshold,
    location,
    category
FROM products 
WHERE quantity <= low_stock_threshold
ORDER BY quantity ASC, name ASC;

-- Drop indexes for the new columns
DROP INDEX IF EXISTS idx_products_tags;
DROP INDEX IF EXISTS idx_products_is_active;
DROP INDEX IF EXISTS idx_products_expiry_date;
DROP INDEX IF EXISTS idx_products_batch_number;
DROP INDEX IF EXISTS idx_products_supplier_name;

-- Remove the new columns
ALTER TABLE products DROP COLUMN IF EXISTS tags;
ALTER TABLE products DROP COLUMN IF EXISTS is_active;
ALTER TABLE products DROP COLUMN IF EXISTS dimensions_cm;
ALTER TABLE products DROP COLUMN IF EXISTS weight_kg;
ALTER TABLE products DROP COLUMN IF EXISTS expiry_date;
ALTER TABLE products DROP COLUMN IF EXISTS batch_number;
ALTER TABLE products DROP COLUMN IF EXISTS supplier_contact;
ALTER TABLE products DROP COLUMN IF EXISTS supplier_name;

COMMIT;