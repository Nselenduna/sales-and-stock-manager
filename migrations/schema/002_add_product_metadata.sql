-- Migration: 002_add_product_metadata
-- Description: Add metadata fields to products table for enhanced inventory tracking
-- Author: Database Migration System
-- Created: 2025-01-04

BEGIN;

-- Add new columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_contact VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(8,3) CHECK (weight_kg > 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions_cm VARCHAR(50); -- e.g., "30x20x15"
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Array of tags for categorization

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_products_supplier_name ON products(supplier_name) WHERE supplier_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_batch_number ON products(batch_number) WHERE batch_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags) WHERE tags IS NOT NULL;

-- Create view for products with expiry alerts
CREATE OR REPLACE VIEW v_expiring_products AS
SELECT 
    id,
    name,
    sku,
    batch_number,
    expiry_date,
    supplier_name,
    quantity,
    location,
    CASE 
        WHEN expiry_date <= CURRENT_DATE THEN 'expired'
        WHEN expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
        WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_month'
        ELSE 'ok'
    END as expiry_status
FROM products 
WHERE expiry_date IS NOT NULL 
    AND is_active = true
ORDER BY expiry_date ASC;

-- Update the existing low stock view to include active filter
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT 
    id,
    name,
    sku,
    quantity,
    low_stock_threshold,
    location,
    category,
    supplier_name,
    is_active
FROM products 
WHERE quantity <= low_stock_threshold
    AND is_active = true
ORDER BY quantity ASC, name ASC;

-- Add comment to document the changes
COMMENT ON COLUMN products.supplier_name IS 'Name of the product supplier or vendor';
COMMENT ON COLUMN products.supplier_contact IS 'Contact information for the supplier';
COMMENT ON COLUMN products.batch_number IS 'Batch or lot number for tracking';
COMMENT ON COLUMN products.expiry_date IS 'Product expiration date';
COMMENT ON COLUMN products.weight_kg IS 'Product weight in kilograms';
COMMENT ON COLUMN products.dimensions_cm IS 'Product dimensions in centimeters (LxWxH)';
COMMENT ON COLUMN products.is_active IS 'Whether the product is active in the system';
COMMENT ON COLUMN products.tags IS 'Array of tags for product categorization';

COMMIT;