# Push Notification Database Schema

This document describes the database schema additions required for the push notification system.

## New Tables

### user_push_tokens
Stores push notification tokens for users to enable server-side notifications.

```sql
CREATE TABLE user_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- Enable Row Level Security
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own tokens
CREATE POLICY "Users can manage their own push tokens" ON user_push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Index for efficient lookups
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_active ON user_push_tokens(is_active) WHERE is_active = true;
```

### notification_history (Optional)
Track notification delivery history for analytics and debugging.

```sql
CREATE TABLE notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('low_stock', 'out_of_stock', 'urgent_message')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed')),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own notification history
CREATE POLICY "Users can view their own notification history" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: System can insert notifications for any user
CREATE POLICY "System can insert notifications" ON notification_history
  FOR INSERT WITH CHECK (true);

-- Indexes for efficient queries
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX idx_notification_history_product_id ON notification_history(product_id) WHERE product_id IS NOT NULL;
```

## Functions and Triggers

### Update timestamp trigger for user_push_tokens
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_push_tokens_updated_at 
    BEFORE UPDATE ON user_push_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### Function to clean up old notification history
```sql
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_history 
    WHERE sent_at < (now() - interval '90 days');
END;
$$ language 'plpgsql';

-- Optional: Create a scheduled job to run cleanup weekly
-- This would need to be set up in your hosting environment
```

## Migration Script

To add these tables to your existing Supabase database:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following migration script:

```sql
-- Migration: Add push notification support
-- Date: [Current Date]

BEGIN;

-- Create user_push_tokens table
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own push tokens" ON user_push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON user_push_tokens(is_active) WHERE is_active = true;

-- Create notification_history table (optional)
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('low_stock', 'out_of_stock', 'urgent_message')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed')),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for notification_history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_history
CREATE POLICY "Users can view their own notification history" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notification_history
  FOR INSERT WITH CHECK (true);

-- Create indexes for notification_history
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_product_id ON notification_history(product_id) WHERE product_id IS NOT NULL;

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_push_tokens
DROP TRIGGER IF EXISTS update_user_push_tokens_updated_at ON user_push_tokens;
CREATE TRIGGER update_user_push_tokens_updated_at 
    BEFORE UPDATE ON user_push_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_history 
    WHERE sent_at < (now() - interval '90 days');
END;
$$ language 'plpgsql';

COMMIT;
```

## Usage Notes

1. **Security**: All tables use Row Level Security (RLS) to ensure users can only access their own data
2. **Performance**: Indexes are created on frequently queried columns
3. **Data Retention**: The notification_history table includes a cleanup function to remove old records
4. **Platform Support**: The schema supports iOS, Android, and Web push notifications
5. **Token Management**: The unique constraint on (user_id, platform) ensures one active token per platform per user