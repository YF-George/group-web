-- Performance Optimization: Add Database Indexes
-- Created: 2026-01-01
-- Description: Improve query performance for common operations

-- Index for member lookups by group
CREATE INDEX IF NOT EXISTS idx_members_group_id 
ON members(group_id);

-- Index for member position lookups (used in every group view)
CREATE INDEX IF NOT EXISTS idx_members_group_position 
ON members(group_id, position_index);

-- Index for groups sorted by raid time (main listing page)
CREATE INDEX IF NOT EXISTS idx_groups_raid_time 
ON groups(raid_time DESC);

-- Index for groups by status (filtering)
CREATE INDEX IF NOT EXISTS idx_groups_status 
ON groups(status);

-- Index for session lookups (authentication)
CREATE INDEX IF NOT EXISTS idx_session_user_id 
ON session(user_id);

-- Index for session expiry cleanup
CREATE INDEX IF NOT EXISTS idx_session_expires_at 
ON session(expires_at);

-- Composite index for audit logs (if exists)
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_lookup 
-- ON audit_logs(table_name, record_id, created_at DESC);

-- Analyze tables to update statistics
ANALYZE members;
ANALYZE groups;
ANALYZE session;
