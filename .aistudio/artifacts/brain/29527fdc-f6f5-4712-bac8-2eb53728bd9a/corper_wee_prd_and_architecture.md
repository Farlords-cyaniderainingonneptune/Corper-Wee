# CORPER WEE: PRODUCT REQUIREMENTS DOCUMENT & SYSTEM ARCHITECTURE

**Project:** Corper Wee  
**Genre:** 3D Life Simulation / Adventure / Social RPG  
**Setting:** NYSC Orientation Camp, Iseyin, Oyo State, Nigeria  
**Primary Platforms:** Android & iOS (Mobile-first 3D)  
**Secondary Platform:** Dedicated Web-Based Admin Portal  
**Target Superadmin:** `farlodunolusege@gmail.com` (`OY/26C/5439`)  

---

## 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1.1 Executive Summary & Vision
*Corper Wee* is an immersive, culturally rich 3D life simulation and social RPG capturing the transformative three-week experience of the National Youth Service Corps (NYSC) orientation camp in Iseyin, Oyo State, Nigeria. Rather than isolated mini-games, *Corper Wee* delivers an integrated, living virtual community. Players experience military drills on the parade ground, scramble through muddy obstacle courses to the canteen, evade stern camp soldiers after lights-out, manage hydration under the hot sun, trade Corper Points for virtual Naira to spend at Mami Market, build charismatic social bonds, and compete for platoon glory.

### 1.2 Target Audience & Core Experience
- **Audience:** Current corps members, prospective corpers (PCMs), alumni seeking nostalgia, and gamers who appreciate social life simulators (The Sims, Bully, Animal Crossing) infused with vibrant Nigerian youth culture.
- **Tone:** Energetic, humorous, competitive, authentic, community-driven, and non-violent (cartoon-style slapstick reactions).
- **Core Loop:**
  1. **Routine & Drills:** Wake up to the bugle, attend parade, execute drill commands, and earn Corper Points (CP).
  2. **Survival & Tasks:** Evade soldier patrols, rush to the canteen, manage personal hydration, and complete camp chores.
  3. **Commerce & Recharging:** Convert CP to Virtual Naira (₦) at the camp bank, visit Mami Market for cold sachet/bottled water, Indomie, suya, and customized camp outfits.
  4. **Social & Competition:** Chat with corpers, test charisma, exchange contact cards, unlock relationship milestones, and elevate platoon standing on the camp leaderboard.

---

### 1.3 Detailed Functional Requirements

#### Module A: Authentication, Identity & Onboarding
- **FR-AUTH-01 (Google Sign-In):** Single Sign-On via Google OAuth 2.0 / OpenID Connect. The user's Google email must be verified.
- **FR-AUTH-02 (NYSC State Code Verification):**
  - Prompt player for their State Code in standard format: `[State 2 Letters]/[Year 2 Digits][Batch A/B/C]/[4-digit Call-up Number]` (e.g. `OY/26C/5439`).
  - Validation engine verifies format regex, uniqueness in the database, and against an administrative whitelist/verification ruleset.
- **FR-AUTH-03 (Character Customization):**
  - Gender selection (Male / Female).
  - Skin tones (diverse melanin spectrum).
  - Hairstyles & headwear (NYSC green crest cap, braids, buzz cuts, afro).
  - Outfits: Standard 7/7 NYSC Khaki (jacket, trousers, jungle boots, crested vest, belt) and White-on-White PT sports kit.
  - Customization saved to player profile in database.
- **FR-AUTH-04 (Platoon Assignment):**
  - Default assignment to Platoons 1 through 10.
  - Balanced auto-distribution algorithm or explicit administrative override.

#### Module B: 3D Camp World & Navigation
- **FR-WORLD-01 (Iseyin Camp Layout):** Stylized 3D recreation of the Iseyin NYSC permanent orientation camp featuring:
  - Central Parade Ground with flagpole and saluting dais.
  - Bustling Mami Market with stalls (drinks, foods, tailors, photo kiosks).
  - Camp Canteen with outdoor seating.
  - Male & Female Hostel blocks with clotheslines.
  - Main Camp Gate & Military Guard Post.
  - Multipurpose Lecture Hall.
  - Administration & Camp Director block.
  - Sports Arena (football pitch & volleyball court).
  - Water dispensing points (borehole/tanks).
- **FR-WORLD-02 (Minimap & Navigation System):**
  - Circular HUD minimap with real-time player GPS dot, camera orientation cone, and quest/facility icons.
  - Full-screen interactive map allowing waypoint pinning and 3D navigation guidance breadcrumbs.
- **FR-WORLD-03 (Day/Night & Schedule Cycle):**
  - Configurable camp clock with morning drills (05:00 - 08:00), lectures/free time (09:00 - 13:00), lunch rush (13:00 - 15:00), afternoon parade (16:00 - 18:00), Mami Market social evening (19:00 - 21:30), and lights-out curfew (22:00).

#### Module C: Core Gameplay Activities & Mini-Games
- **FR-ACT-01 (Parade Ground Drill Command):**
  - Military drill commands: *Attention!*, *Stand at Ease!*, *Quick March!*, *Halt!*, *Left Turn!*, *Right Turn!*, *About Turn!*, *Eyes Right!*, *Salute!*.
  - Rhythm / quick-time event (QTE) mechanics with precision timing windows (Perfect: +50 CP, Good: +25 CP, Late: +5 CP, Wrong Action: -20 CP, Missed: -30 CP).
  - Individual score and platoon multiplier bonus.
- **FR-ACT-02 (The Canteen Rush Obstacle Course):**
  - Timed dash from hostel/parade ground to the canteen before food serves out.
  - Dynamic obstacles: Barricades, muddy rain puddles (causes slip & speed debuff), meandering corpers, wheelbarrows, and narrow pathways.
  - Stamina gauge: Sprinting drains stamina; jumping over barricades requires stamina management.
  - Time-bonus rewards and canteen voucher tokens.
- **FR-ACT-03 (Avoid the Soldiers - Stealth Infiltration):**
  - Night-time or restricted-area stealth evasion mini-game.
  - Soldier AI patrols with dynamic detection cones (visual line-of-sight and auditory radius when sprinting on gravel).
  - Safe hiding spots: Behind hostel water tanks, under verandahs, inside market shadows.
  - Humorous penalty if caught: Drill frog-jumps ("kneel down, pick pin!") and point forfeiture.
- **FR-ACT-04 (Water & Hydration Management):**
  - Dynamic Hydration Meter (0 - 100%).
  - Drains at 1% per 30 seconds idle, 1% per 8 seconds running/marching, accelerated by sunny weather.
  - Low hydration (<25%): Visual blur, movement speed reduced by 40%, stamina regenerates 60% slower.
  - Critical depletion (0%): Forced walk, cannot enter competitive events.
  - Refill points: Sachet "pure water" (+35% water, cheap), bottled swan water (+80% water, moderate cost), glucose chilled drink (+100% water + temporary speed boost).

#### Module D: Camp Economy & Mami Market
- **FR-ECON-01 (Dual-Currency Architecture):**
  - **Corper Points (CP):** Soulbound achievement/merit currency earned through parades, mini-games, and good conduct.
  - **Virtual Naira (₦):** Spendable camp liquid currency used across stalls.
- **FR-ECON-02 (Currency Exchange Bureau):**
  - Camp bank kiosk where players convert CP to ₦ at the admin-configured exchange rate (default: 10 CP = ₦100).
  - Audit trail of every exchange to detect anomalies.
- **FR-ECON-03 (Mami Market Commerce):**
  - Stalls with catalog: Hot jollof rice & chicken, Indomie noodles with fried egg, Suya & dodo, sachet & bottled water, sunglasses, custom boots, waist bags, battery powerbanks.
  - Server-authoritative purchase transaction verifying wallet balance and stock availability before incrementing inventory.

#### Module E: Charisma & Social RPG System
- **FR-SOC-01 (Charisma Attribute):**
  - Dynamic rating (1–100) scaled by parade rank, stylish outfit combinations, completed challenges, and positive social engagements.
- **FR-SOC-02 (Interactive Dialogue & Approaches):**
  - Interaction menu: *Friendly Greeting*, *Crack Camp Joke*, *Offer Sachet Water*, *Compliment Fit*, *Request Phone Contact*, *Ask to Dance*.
  - Outcome calculation based on charisma check:
    - **Success:** Relationship points increase, unlock friend contact card, increase platoon morale.
    - **Failure:** Cartoon-style rejection (slapstick comedy: exaggerated puff of smoke, cartoon slap sound, light comedic embarrassment animation, -2 charisma cooldown).
- **FR-SOC-03 (Consent-Based Digital Contact Exchange):**
  - Mutual confirmation required to become "Camp Buddies" and exchange in-game contact cards.
  - Strict privacy: Real email addresses and real phone numbers are never shared or collected. Only in-game nicknames and virtual profiles are displayed.
- **FR-SOC-04 (Safety & Moderation):**
  - Player reporting, mute, and block functionality accessible directly from character inspection cards.

#### Module F: Platoon Structure & Camp Events
- **FR-PLT-01 (Platoon Leaderboards & Competitions):**
  - 10 Platoons with distinct colors, motto, and aggregated leaderboard points.
  - Daily events: Inter-platoon drill competition, carnival dance-off, football match, sanitation inspection.
  - Platoon awards ceremony at the end of the 21-day virtual cycle.
- **FR-EVT-01 (Scheduled Camp Events):**
  - Event scheduler with push/in-game announcements (e.g. "Swearing-In Ceremony in 10 minutes at the Parade Ground!").

---

### 1.4 Admin Portal Functional Requirements

#### Module G: Superadmin & Administrative Governance
- **FR-ADM-01 (Protected Superadmin Initialization):**
  - Initial Superadmin hard-linked to email `farlodunolusege@gmail.com` with State Code `OY/26C/5439`.
  - System enforces role `SUPERADMIN` which cannot be modified, demoted, suspended, or deleted via API or UI.
- **FR-ADM-02 (Single-Use Admin Invitation Tokens):**
  - Superadmin generates cryptographic, single-use, time-expiring invitation tokens sent to designated staff email addresses.
  - Verification validates invitee email upon Google OAuth authentication before granting `ADMIN` role.
- **FR-ADM-03 (Player Management & Moderation):**
  - Searchable directory of all players by username, state code, platoon, or status.
  - Actions: Inspect profile, inspect transaction logs, adjust platoon assignment, suspend account (immediate token invalidation), unsuspend, or soft-delete.
- **FR-ADM-04 (Economy & Mami Market Control):**
  - Real-time adjustment of CP-to-₦ conversion rate.
  - Inventory management: Add new products, update prices, modify stock quantities, activate/deactivate items.
  - Comprehensive ledger of all point and wallet transactions for financial anomaly detection.
- **FR-ADM-05 (Location & Activity Zone Editor):**
  - Define, update, or deactivate camp zones and mini-game triggers with coordinates and radii.
- **FR-ADM-06 (Parade & Event Configuration):**
  - Configure drill command sequences, timing tolerances, and point values.
  - Schedule camp events with start/end timestamps, target platoons, and bonus rewards.
- **FR-ADM-07 (Audit Logging):**
  - Immutable audit trail recording every administrative action (actor ID, IP, timestamp, target entity, previous state, new state).

---

## 2. SYSTEM ARCHITECTURE

```
                                  +------------------------------------+
                                  |         CLIENT APPLICATIONS        |
                                  +------------------------------------+
                                    |                                |
                 +------------------+                                +------------------+
                 |                                                                      |
                 v                                                                      v
    +----------------------------------+                              +----------------------------------+
    |       3D MOBILE / WEB GAME       |                              |        ADMIN WEB PORTAL          |
    |  - Three.js / WebGL 3D World     |                              |  - React + TypeScript SPA        |
    |  - Virtual Joystick / Touch HUD  |                              |  - Lucide Icons & Tailwind CSS   |
    |  - Web Audio Synthesizer         |                              |  - RBAC Protected Dashboard      |
    |  - Real-time Sync & Mini-games   |                              |  - Economy & Platoon Management  |
    +----------------------------------+                              +----------------------------------+
                 |                                                                      |
                 | HTTP REST / JSON + WebSockets                                        | HTTP REST / JSON
                 | Bearer JWT (Google Verified)                                         | Bearer JWT (Admin Role)
                 v                                                                      v
    +----------------------------------------------------------------------------------------------------+
    |                                AUTHORITATIVE BACKEND (Node.js / Express)                           |
    |  +--------------------+  +--------------------+  +--------------------+  +---------------------+   |
    |  |  Auth & RBAC Guard |  | Economy Controller |  | Activity & Scoring |  | Real-time Sync Hub  |   |
    |  +--------------------+  +--------------------+  +--------------------+  +---------------------+   |
    |  +--------------------+  +--------------------+  +--------------------+  +---------------------+   |
    |  | Platoon & Events   |  | Social & Charisma  |  | Admin Service      |  | Audit Log Engine    |   |
    |  +--------------------+  +--------------------+  +--------------------+  +---------------------+   |
    +----------------------------------------------------------------------------------------------------+
                                    |                                |
                                    v                                v
    +--------------------------------------------------+  +----------------------------------------------+
    |         RELATIONAL DATABASE (PostgreSQL)         |  |         IN-MEMORY CACHE (Redis / Memory)     |
    |  - Fully Normalized Ledger Schema                |  |  - Active Player Presence & Coords           |
    |  - Users, Wallets, Transactions, Platoons        |  |  - High-Velocity Leaderboard Caching         |
    |  - ACID Integrity for Purchases & Conversions    |  |  - Distributed Rate Limiting & Cooldowns     |
    +--------------------------------------------------+  +----------------------------------------------+
```

### 2.1 Component Separation & Responsibilities
1. **Client Game Application:**
   - 3D rendering pipeline (Three.js with PBR materials, tone mapping, soft shadows, low-poly optimized models).
   - Local character simulation (input handling, kinematic collision, animation state blending).
   - Optimistic local feedback with server validation.
   - Client is treated as an **untrusted display terminal** for all financial and progression state.
2. **Authoritative Backend API:**
   - Stateless Node.js / Express server validating Google JWT tokens.
   - Authoritative calculation of rewards, penalties, and balance increments.
   - Mutex / transactional isolation on wallet spending to prevent race conditions or double-spending.
3. **Dedicated Admin Portal:**
   - Standalone administrative interface.
   - Secure routes guarded by permission verification middleware.
   - Superadmin-exclusive views and audit logs.

### 2.2 Security & Anti-Cheat Architecture
- **Never Trust Client Balance:** The client cannot pass `newBalance` in any request. The client only sends action tokens (e.g. `POST /api/v1/activities/parade/submit` with raw timestamps and inputs), and the server evaluates accuracy and calculates the reward.
- **Double-Spend Prevention:** Currency conversions and item purchases execute inside database transactions with row-level locks on `wallets`.
- **Token Invalidation:** When an account is suspended, all existing sessions and refresh tokens are immediately revoked.
- **Rate-Limiting:** Express rate-limiting on sensitive endpoints (authentication, conversions, and social actions).

---

## 3. USER FLOWS

### Flow 1: Player Onboarding & State Code Verification
```
[User] -> [Click "Continue with Google"]
           |
           v
[Client] -> Authenticates with Google OAuth -> Obtains Google ID Token
           |
           v
[Backend] -> POST /api/v1/auth/google
             - Verifies token signature with Google JWKS
             - Extracts verified email, sub, and name
             - Checks if User exists in DB
             |
             +---> [If User Exists] -> Issues CorperWee JWT -> Route to Main Game HUD
             |
             +---> [If New User] -> Issues Registration Token -> Route to State Code Onboarding
                     |
                     v
             [User Enters State Code: e.g. "OY/26C/5439"]
                     |
                     v
             [Backend] -> POST /api/v1/auth/register-state-code
                          - Checks Regex: ^[A-Z]{2}\/\d{2}[A-C]\/\d{4}$
                          - Checks DB uniqueness constraint
                          - Creates User, Wallet (0 CP, 0 ₦), WaterMeter (100%)
                          - Assigns to Platoon (1-10 round-robin or configured)
                          - Routes to Character Creator
```

### Flow 2: Character Creation & Camp Entry
```
[User in 3D Wardrobe Studio]
   |
   +-> Select Gender [Male / Female]
   +-> Select Skin Tone [Warm Espresso, Bronze, Caramel, Deep Honey]
   +-> Select Hairstyle [Crest Cap, Neat Fade, Braids, Natural Afro]
   +-> Select Uniform [Full Khaki 7/7 vs PT White-on-White]
   |
   v
[Click "Confirm & Deploy to Iseyin Camp"]
   |
   v
[Backend] -> POST /api/v1/players/character
             - Validates asset IDs against unlocked catalog
             - Persists character config to player_characters
             - Spawns player at Camp Gate / Platoon Hostel
```

### Flow 3: The Daily Camp Gameplay & Economy Loop
```
[Morning Bugle Call (05:00)]
   |
   v
[Move to Parade Ground] -> Enter Parade Drill Circle
   |
   v
[Parade Drill Mini-Game] -> Follow Sergeant Commands (Quick March, Salute, Left Turn)
   |
   +-> Perfect Execution -> Server awards +150 CP -> Platoon score increments
   |
   v
[Hydration Drops to 30%] -> Alert: "Oga, water don finish! Find Mami Market"
   |
   v
[Visit Camp Bank Booth] -> POST /api/v1/economy/exchange (Convert 50 CP -> ₦500)
   |
   v
[Visit Mami Market Drink Vendor] -> POST /api/v1/market/buy (1x Chilled Bottle Water for ₦200)
   |
   v
[Drink Water from Inventory] -> Hydration refills to 100% -> Movement speed restored
   |
   v
[Socialize with Fellow Corpers] -> Test Charisma -> Build Friendship
```

### Flow 4: Superadmin Bootstrapping & Admin Invitation Flow
```
[Application Startup / DB Migration Seed]
   |
   v
[Check DB for Superadmin: farlodunolusege@gmail.com]
   |
   +-> Exists? -> Verify role is SUPERADMIN and State Code is OY/26C/5439 -> No-op (Idempotent)
   +-> Missing? -> Create User with SUPERADMIN role, State Code OY/26C/5439, immutable flag = true
   |
[Superadmin Logs In to Admin Portal via Google]
   |
   v
[Superadmin Navigates to Staff Management]
   |
   +-> Enters New Officer Email: "camp_commandant@nysc.gov.ng"
   +-> Clicks "Generate Admin Invitation"
   |
[Backend] -> Creates single-use cryptographically random token (expires in 48h) in admin_invitations
             Logs action to audit_logs
   |
[Invitee opens link -> Authenticates via Google with matching email]
   |
[Backend] -> Validates token, activates Admin account with RBAC: ADMIN, marks token consumed
```

---

## 4. DATABASE DESIGN (POSTGRESQL SCHEMA)

```sql
-- ============================================================================
-- CORPER WEE: AUTHORITATIVE POSTGRESQL SCHEMA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS & DOMAINS
CREATE TYPE user_role_type AS ENUM ('PLAYER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE account_status_type AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_REGISTRATION');
CREATE TYPE transaction_type AS ENUM ('EARN_ACTIVITY', 'PENALTY_ACTIVITY', 'CP_EXCHANGE', 'MARKET_PURCHASE', 'ADMIN_ADJUSTMENT');
CREATE TYPE interaction_outcome AS ENUM ('GREAT_SUCCESS', 'MILD_SUCCESS', 'REJECTED', 'COMEDIC_SLAP', 'COMEDIC_PUNCH');

-- 2. CORE USERS & AUTHENTICATION
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    state_code VARCHAR(30) UNIQUE,
    role user_role_type NOT NULL DEFAULT 'PLAYER',
    status account_status_type NOT NULL DEFAULT 'ACTIVE',
    is_protected BOOLEAN NOT NULL DEFAULT FALSE, -- Superadmin protection flag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_state_code ON users(state_code);
CREATE INDEX idx_users_role ON users(role);

-- 3. ADMIN INVITATIONS
CREATE TABLE admin_invitations (
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

CREATE INDEX idx_admin_invitations_token ON admin_invitations(token);

-- 4. PLATOONS
CREATE TABLE platoons (
    id SERIAL PRIMARY KEY,
    number INT UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    color_hex VARCHAR(10) NOT NULL,
    motto TEXT,
    total_points BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PLAYER PROFILES & CHARACTERS
CREATE TABLE player_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    platoon_id INT REFERENCES platoons(id) ON DELETE SET NULL,
    level INT NOT NULL DEFAULT 1,
    experience_points BIGINT NOT NULL DEFAULT 0,
    charisma_score INT NOT NULL DEFAULT 10 CHECK (charisma_score BETWEEN 1 AND 100),
    reputation_score INT NOT NULL DEFAULT 50,
    parade_rank VARCHAR(50) NOT NULL DEFAULT 'Recruit Corper',
    total_parades_completed INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_characters (
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

-- 6. WALLETS & DUAL-CURRENCY LEDGERS
CREATE TABLE wallets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    corper_points BIGINT NOT NULL DEFAULT 0 CHECK (corper_points >= 0),
    virtual_naira NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (virtual_naira >= 0.00),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- positive for credit, negative for debit
    balance_after BIGINT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_point_tx_user ON point_transactions(user_id, created_at DESC);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL, -- positive for credit, negative for debit
    balance_after NUMERIC(14, 2) NOT NULL,
    transaction_type transaction_type NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);

-- 7. WATER METER & SURVIVAL
CREATE TABLE water_meters (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_level NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (current_level BETWEEN 0.00 AND 100.00),
    last_depleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. LOCATIONS & ZONES
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    pos_x NUMERIC(10, 2) NOT NULL,
    pos_y NUMERIC(10, 2) NOT NULL,
    pos_z NUMERIC(10, 2) NOT NULL,
    trigger_radius NUMERIC(10, 2) NOT NULL DEFAULT 5.0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PRODUCTS & MAMI MARKET INVENTORY
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE products (
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

CREATE TABLE player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- 10. ACTIVITIES & SESSIONS
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_reward_cp INT NOT NULL DEFAULT 50,
    penalty_cp INT NOT NULL DEFAULT 20
);

CREATE TABLE activity_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id INT NOT NULL REFERENCES activities(id),
    score INT NOT NULL DEFAULT 0,
    points_awarded INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    accuracy_percentage NUMERIC(5, 2),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. SOCIAL INTERACTIONS & FRIENDSHIPS
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_score INT NOT NULL DEFAULT 10,
    status VARCHAR(20) NOT NULL DEFAULT 'MUTUAL', -- MUTUAL, PENDING, BLOCKED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (user_id_1 <> user_id_2),
    UNIQUE(user_id_1, user_id_2)
);

CREATE TABLE social_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL,
    outcome interaction_outcome NOT NULL,
    charisma_at_time INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDIT LOGS & SETTINGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. SEED ESSENTIAL SETTINGS & FIRST SUPERADMIN GUARD
INSERT INTO game_settings (key, value, description) VALUES
('cp_to_naira_rate', '{"cp": 10, "naira": 100.0}', 'Corper Points to Virtual Naira exchange conversion rate'),
('hydration_drain_rate', '{"idle_per_min": 2.0, "run_per_min": 7.5}', 'Water percentage depletion rates'),
('parade_difficulty_params', '{"tolerance_ms": 300, "perfect_multiplier": 1.5}', 'Parade rhythm QTE window thresholds');
```

---

## 5. API SPECIFICATION

All endpoints are prefixed with `/api/v1`. Authenticated requests require an `Authorization: Bearer <JWT>` header.

### 5.1 Authentication & Profile Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/google` | Public | Verify Google OAuth identity token, return JWT session. |
| `POST` | `/auth/register-state-code` | Authenticated (New) | Bind and validate NYSC State Code to authenticated user. |
| `GET` | `/players/me` | Authenticated | Fetch active player profile, wallet, character, water meter, and platoon. |
| `PUT` | `/players/character` | Authenticated | Update 3D character customization (skin, hair, uniform, gender). |

### 5.2 World, Minimap & Locations
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/world/locations` | Authenticated | List all active camp locations, 3D coordinates, and trigger zones. |
| `POST` | `/world/sync-position` | Authenticated | Heartbeat: sync player 3D coordinates and deplete water meter. |

### 5.3 Gameplay Activities & Mini-Games
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/activities/parade/submit` | Authenticated | Submit parade drill session input timings for authoritative CP reward. |
| `POST` | `/activities/canteen-rush/submit`| Authenticated | Authoritatively validate obstacle course completion time and awards. |
| `POST` | `/activities/stealth/report` | Authenticated | Report stealth evasion outcome (survived or caught by patrol). |

### 5.4 Economy, Mami Market & Water
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/market/products` | Authenticated | Fetch current Mami Market catalog with prices, stock, and item stats. |
| `POST` | `/market/buy` | Authenticated | Purchase an item with Virtual Naira (deducts ₦, adds item to inventory). |
| `POST` | `/economy/exchange` | Authenticated | Exchange Corper Points (CP) for Virtual Naira (₦) at current rate. |
| `POST` | `/water/consume` | Authenticated | Consume sachet or bottled water from inventory to replenish water meter. |

### 5.5 Social & Platoon Systems
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/platoons` | Authenticated | Get all 10 platoons with current rankings and aggregated points. |
| `POST` | `/social/interact` | Authenticated | Trigger charisma interaction with nearby corper; server resolves outcome. |
| `GET` | `/social/friends` | Authenticated | Fetch current friend list and relationship statuses. |

### 5.6 Admin & Superadmin Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/dashboard` | Admin/Superadmin | Real-time camp telemetry: active corpers, economy velocity, incident log. |
| `GET` | `/admin/players` | Admin/Superadmin | Search and filter registered corpers with state codes and balances. |
| `POST` | `/admin/players/:id/suspend`| Admin/Superadmin | Instantly suspend a player and revoke tokens (Superadmin protected). |
| `PUT` | `/admin/economy/rates` | Admin/Superadmin | Update CP-to-₦ conversion rate (logged to audit table). |
| `POST` | `/admin/market/products` | Admin/Superadmin | Create or edit products in Mami Market (prices, stock, buffs). |
| `POST` | `/admin/invitations` | **Superadmin Only** | Generate secure, single-use invite token for new camp administrator. |
| `GET` | `/admin/audit-logs` | **Superadmin Only** | Comprehensive immutable audit ledger of all staff actions. |

---

## 6. DEVELOPMENT ROADMAP

```
+-----------------------------------------------------------------------------------------------------+
| PHASE 1: FOUNDATION & SECURITY CORE (Week 1)                                                       |
| - Express Server & PostgreSQL connection with resilient mock/in-memory fallback                     |
| - Complete Auth Engine: Google OAuth verification, State Code regex validator                       |
| - Superadmin Seed: Guaranteed bootstrap for farlodunolusege@gmail.com (OY/26C/5439)                 |
| - Authoritative Dual-Currency Wallet & Water Meter system                                           |
+-----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+-----------------------------------------------------------------------------------------------------+
| PHASE 2: 3D CAMP WORLD & PLAYER AVATAR ENGINE (Week 2)                                              |
| - Three.js 3D viewport with PBR lighting, atmospheric sky, and ground terrain                       |
| - Modular Procedural 3D Camp Environment: Parade Ground, Mami Market stalls, Canteen, Hostels       |
| - Stylized 3D Corper Character: Khaki 7/7, Crest Cap, White PT kits, skin tone variations          |
| - Third-person camera controller with virtual joystick and desktop WASD navigation                 |
| - Dynamic HUD: Circular Minimap, Hydration Meter, CP/₦ Balances, Control hints                     |
+-----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+-----------------------------------------------------------------------------------------------------+
| PHASE 3: CORE GAMEPLAY LOOPS & MINI-GAMES (Week 3)                                                  |
| - Activity 1: Parade Ground QTE Drill simulator (commands, timing windows, audio synth cues)       |
| - Activity 2: Canteen Rush obstacle course (barricades, puddles, stamina sprint, timer)             |
| - Activity 3: Avoid the Soldiers stealth patrol (soldier cone of vision, hiding spots, frog-jumps)  |
| - Activity 4: Water Management mechanics (depletion loop, sachet/bottle drinking recharge)         |
+-----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+-----------------------------------------------------------------------------------------------------+
| PHASE 4: MAMI MARKET COMMERCE & SOCIAL RPG (Week 4)                                                 |
| - Mami Market storefront: Food, Cold Drinks, Boots, Waist-bags, Indomie stalls                      |
| - Currency Exchange Kiosk: Convert CP to Virtual ₦ with live transactional ledger                   |
| - Charisma System: Approach NPCs/corpers, dialogue branches, charisma checks, slapstick reactions   |
| - Platoon Leaderboard: 10 Platoons competing with live aggregate points                             |
+-----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+-----------------------------------------------------------------------------------------------------+
| PHASE 5: DEDICATED SEPARATE ADMIN PORTAL (Week 5)                                                   |
| - Standalone Admin Portal UI with dark/light camp commandant theme                                  |
| - Superadmin Console: Invitation token generator, audit trail viewer, role enforcement              |
| - Real-time Player Management: Inspect state codes, adjust platoons, apply suspensions              |
| - Live Economic Controls: Adjust CP-to-₦ rate, product catalog prices, and stock                    |
| - Event & Location Scheduler: Dispatch camp-wide announcements and drill sessions                  |
+-----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+-----------------------------------------------------------------------------------------------------+
| PHASE 6: POLISH, AUDIO, INTEGRATION & TESTING (Week 6)                                              |
| - Web Audio API procedural sound engine: Military bugle calls, parade drum cadences, Nigerian banter|
| - Performance optimization (60 FPS on mobile, instanced meshes, texture atlases)                    |
| - End-to-end integration testing and superadmin security audit verification                         |
+-----------------------------------------------------------------------------------------------------+
```

---

## 7. VERIFICATION & ACCEPTANCE CRITERIA
1. **Superadmin Integrity:** `farlodunolusege@gmail.com` with State Code `OY/26C/5439` is automatically recognized as immutable `SUPERADMIN`.
2. **State Code Validation:** Rejects invalid format or duplicate NYSC State Codes while accepting canonical formats (e.g. `OY/26C/5439`, `LA/25A/1204`).
3. **Dual Economy Integrity:** Corper Points cannot be forged client-side; converting CP to ₦ strictly respects server rates; Mami Market purchases deduct ₦ and award items atomically.
4. **Hydration Mechanics:** Moving depletes the water meter; depleted water slows movement; drinking water vendor items restores hydration.
5. **Gameplay Feel:** 60fps responsive 3D loop, low-occlusion HUD, procedural audio cues for parade commands and soldier encounters.
6. **Admin Isolation:** Admin portal operates independently, requiring elevated credentials with complete audit logging.
