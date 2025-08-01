-- Add missing status column to sales table
-- Run this in your Supabase SQL editor

-- Add status column if it doesn't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'synced', 'failed'));

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- Update any existing records to have 'synced' status
UPDATE sales SET status = 'synced' WHERE status IS NULL; 