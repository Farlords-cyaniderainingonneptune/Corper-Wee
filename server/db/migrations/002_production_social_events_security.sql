-- ============================================================================
-- CORPER WEE: DATABASE MIGRATION 002 - SOCIAL, EVENTS, SECURITY & NOTIFICATIONS
-- Target Database: PostgreSQL 14+ (Idempotent production migration)
-- ============================================================================

-- 1. EXTEND ACCOUNT STATUS ENUM & USERS FOR RETENTION POLICY & PERMISSIONS
ALTER TYPE account_status_type ADD VALUE IF NOT EXISTS 'DELETED';

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS custom_permissions JSONB,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP WITH TIME ZONE;

-- 2. EXTEND ADMIN INVITATIONS WITH SCOPED PERMISSIONS & REVOCATION TRACKING
ALTER TABLE admin_invitations
    ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS consumed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS revoked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

-- 3. REFRESH TOKENS (ROTATION + REUSE FAMILY DETECTION)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    family_id UUID NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_by_token_hash VARCHAR(128),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);

-- 4. IDEMPOTENCY LEDGER KEYS (PREVENTS DOUBLE CHARGES / REPLAYS)
CREATE TABLE IF NOT EXISTS idempotency_records (
    key VARCHAR(160) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(80) NOT NULL,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records(expires_at);

-- 5. LOCATIONS SOFT DELETE & EVENTS SYSTEM
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS camp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camp_id INT NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    location_id INT REFERENCES locations(id) ON DELETE SET NULL,
    location_name VARCHAR(120) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reward_cp INT NOT NULL DEFAULT 50 CHECK (reward_cp >= 0),
    reward_naira NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (reward_naira >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    target_platoon_id INT REFERENCES platoons(id) ON DELETE SET NULL,
    min_charisma_required INT NOT NULL DEFAULT 0,
    max_participants INT NOT NULL DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_camp_events_status_start ON camp_events(status, start_time);

CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES camp_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attended BOOLEAN NOT NULL DEFAULT TRUE,
    reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(event_id, user_id)
);

-- 6. SOCIAL FRIENDSHIPS, PRIVACY, BLOCKS & REPORTS
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    relationship_score INT NOT NULL DEFAULT 25 CHECK (relationship_score BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_user_id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_user_id, blocked_user_id)
);

CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(120) NOT NULL,
    details TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    resolved_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    allow_interactions BOOLEAN NOT NULL DEFAULT TRUE,
    allow_friend_requests BOOLEAN NOT NULL DEFAULT TRUE,
    show_online_status BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CAMP NOTIFICATIONS FEED
CREATE TABLE IF NOT EXISTS camp_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(40) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(120) NOT NULL,
    actor_state_code VARCHAR(30),
    platoon_number INT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_camp_notifications_created ON camp_notifications(created_at DESC);
