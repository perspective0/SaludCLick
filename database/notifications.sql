-- Notifications and reminders extension for SaludClick.
-- Safe to run on existing databases.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30),
  type VARCHAR(40) DEFAULT 'general',
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  message TEXT,
  url TEXT,
  entity_type VARCHAR(60),
  entity_id UUID,
  status VARCHAR(20) DEFAULT 'unread',
  priority VARCHAR(20) DEFAULT 'normal',
  channel VARCHAR(30) DEFAULT 'in_app',
  provider_status VARCHAR(40),
  provider_response JSONB,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS role VARCHAR(30);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(40) DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(60);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unread';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(30) DEFAULT 'in_app';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_status VARCHAR(40);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_response JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

UPDATE notifications SET message = body WHERE message IS NULL;
UPDATE notifications SET status = CASE WHEN read_at IS NULL THEN 'unread' ELSE 'read' END WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created ON notifications(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created ON notifications(user_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
