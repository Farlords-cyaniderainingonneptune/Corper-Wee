-- ============================================================================
-- CORPER WEE: DATABASE MIGRATION 001 - INITIAL SCHEMA
-- Target Database: PostgreSQL 14+
-- Supports Multi-Camp Expansion & Authoritative Gaming
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role_type AS ENUM ('PLAYER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE account_status_type AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_REGISTRATION');
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE');
CREATE TYPE transaction_type AS ENUM ('EARN_ACTIVITY', 'PENALTY_ACTIVITY', 'CP_EXCHANGE', 'MARKET_PURCHASE', 'ADMIN_ADJUSTMENT');
CREATE TYPE interaction_outcome AS ENUM ('GREAT_SUCCESS', 'MILD_SUCCESS', 'REJECTED', 'COMEDIC_SLAP', 'COMEDIC_PUNCH');

-- 2. CAMPS TABLE (Allows future scaling beyond Iseyin to other NYSC Camps)
CREATE TABLE IF NOT EXISTS camps (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    state_code VARCHAR(30) UNIQUE,
    role user_role_type NOT NULL DEFAULT 'PLAYER',
    status account_status_type NOT NULL DEFAULT 'ACTIVE',
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_state_code ON users(state_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. ADMIN INVITATIONS TABLE (Superadmin invite tokens)
CREATE TABLE IF NOT EXISTS admin_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_role user_role_type NOT NULL DEFAULT 'ADMIN',
    is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    consumed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(token);

-- 5. PLATOONS TABLE
CREATE TABLE IF NOT EXISTS platoons (
    id SERIAL PRIMARY KEY,
    camp_id INT NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(10) NOT NULL,
    motto TEXT,
    total_points BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(camp_id, number)
);

-- 6. PLAYER PROFILES TABLE
CREATE TABLE IF NOT EXISTS player_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    platoon_id INT REFERENCES platoons(id) ON DELETE SET NULL,
    level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
    experience_points BIGINT NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
    charisma_score INT NOT NULL DEFAULT 10 CHECK (charisma_score BETWEEN 1 AND 100),
    reputation_score INT NOT NULL DEFAULT 50,
    parade_rank VARCHAR(50) NOT NULL DEFAULT 'Recruit Corper',
    total_parades_completed INT NOT NULL DEFAULT 0,
    camp_nickname VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PLAYER CHARACTERS TABLE
CREATE TABLE IF NOT EXISTS player_characters (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gender gender_type NOT NULL DEFAULT 'MALE',
    skin_tone_hex VARCHAR(10) NOT NULL DEFAULT '#8D5524',
    hairstyle VARCHAR(50) NOT NULL DEFAULT 'nysc_crest_cap',
    hair_color_hex VARCHAR(10) NOT NULL DEFAULT '#1A1A1A',
    uniform_type VARCHAR(50) NOT NULL DEFAULT 'khaki_7_7',
    footwear VARCHAR(50) NOT NULL DEFAULT 'jungle_boots',
    accessory VARCHAR(50) DEFAULT 'waist_bag',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. WALLETS & DUAL-CURRENCY LEDGERS
CREATE TABLE IF NOT EXISTS wallets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    corper_points BIGINT NOT NULL DEFAULT 0 CHECK (corper_points >= 0),
    virtual_naira NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (virtual_naira >= 0.00),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_point_tx_user ON point_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    transaction_type transaction_type NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);

-- 9. WATER METERS TABLE
CREATE TABLE IF NOT EXISTS water_meters (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_level NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (current_level BETWEEN 0.00 AND 100.00),
    last_depleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    camp_id INT NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    pos_x NUMERIC(10, 2) NOT NULL,
    pos_y NUMERIC(10, 2) NOT NULL,
    pos_z NUMERIC(10, 2) NOT NULL,
    trigger_radius NUMERIC(10, 2) NOT NULL DEFAULT 6.0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(camp_id, slug)
);

-- 11. PRODUCTS & INVENTORY
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES product_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_naira NUMERIC(10, 2) NOT NULL CHECK (price_naira >= 0),
    water_refill_value NUMERIC(5, 2) DEFAULT 0.00,
    stamina_boost_value NUMERIC(5, 2) DEFAULT 0.00,
    charisma_boost_value INT DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 9999,
    icon_key VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- 12. ACTIVITY SESSIONS
CREATE TABLE IF NOT EXISTS activity_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_slug VARCHAR(50) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    points_awarded INT NOT NULL DEFAULT 0,
    accuracy_percentage NUMERIC(5, 2),
    duration_seconds INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. AUDIT LOGS & SETTINGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
