-- Rollback for Migration: 001_initial_schema
-- Description: Drop all tables and objects created in initial schema migration
-- Author: Database Migration System
-- Created: 2025-01-04

BEGIN;

-- Drop views first (due to dependencies)
DROP VIEW IF EXISTS v_sales_with_products;
DROP VIEW IF EXISTS v_low_stock_products;

-- Drop triggers
DROP TRIGGER IF EXISTS update_sales_transaction_items_updated_at ON sales_transaction_items;
DROP TRIGGER IF EXISTS update_sales_transactions_updated_at ON sales_transactions;
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS sales_transaction_items;
DROP TABLE IF EXISTS sales_transactions;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- Note: We don't drop extensions as they might be used by other parts of the system
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";

COMMIT;