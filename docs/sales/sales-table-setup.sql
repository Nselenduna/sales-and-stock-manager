-- Sales Module Database Setup
-- Run this SQL in your Supabase SQL editor

-- Create sales table with JSON items column
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total INTEGER NOT NULL DEFAULT 0, -- in pence
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'synced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);

-- Create index on store_id for filtering by store
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);

-- Enable Row Level Security (RLS)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read their own sales
CREATE POLICY "Users can view sales" ON sales
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert sales
CREATE POLICY "Users can create sales" ON sales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update sales
CREATE POLICY "Users can update sales" ON sales
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO sales (id, items, total, status, created_at) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001',
    '[
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440002",
        "quantity": 2,
        "unit_price": 500,
        "total_price": 1000,
        "product_name": "Sample Product 1"
      },
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440003", 
        "quantity": 1,
        "unit_price": 750,
        "total_price": 750,
        "product_name": "Sample Product 2"
      }
    ]'::jsonb,
    1750,
    'synced',
    NOW() - INTERVAL '1 day'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    '[
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440005",
        "quantity": 3,
        "unit_price": 300,
        "total_price": 900,
        "product_name": "Sample Product 3"
      }
    ]'::jsonb,
    900,
    'queued',
    NOW() - INTERVAL '2 hours'
  )
ON CONFLICT (id) DO NOTHING; 