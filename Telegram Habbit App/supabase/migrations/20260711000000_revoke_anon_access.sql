-- SEC-3: Revoke anon role access to all tables.
-- The anon role should NEVER have direct access to user data.
-- Only authenticated (via custom JWT) and service_role (for Edge Functions) need access.

-- Revoke all existing grants from anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Re-grant only to the roles that need access
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;

-- Add performance indexes for reminders (used by cron-reminders)
CREATE INDEX IF NOT EXISTS idx_hs_reminders_active ON hs_reminders(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_hs_reminders_user_id ON hs_reminders(user_id);
