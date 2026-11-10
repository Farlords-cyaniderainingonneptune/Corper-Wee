# CORPER WEE: TECHNICAL ARCHITECTURE, DATABASE DESIGN & API CONTRACTS

**Project:** Corper Wee  
**Platform Architecture:** Mobile/Web 3D Simulation Client + Authoritative Express Backend + PostgreSQL Database + Dedicated React Admin Portal  
**Initial Superadmin:** `farlodunolusege@gmail.com` | State Code: `OY/26C/5439` | Role: `SUPERADMIN`  

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Complete End-to-End System Diagram (Mermaid)

```mermaid
flowchart TB
    subgraph Clients ["Client Tier"]
        MobileClient["Unity 3D / WebGL Mobile Game\n(Player Experience)\n- Virtual Joystick & HUD\n- 3D Camp Navigation\n- Rhythm Parade & Obstacles\n- Hydration & Mami Market"]
        AdminPortal["React + TypeScript Admin Portal\n(Camp Command Interface)\n- Superadmin Console\n- Live Player Directory\n- Economy Balancing (CP/₦)\n- Audit Trail & Telemetry"]
    end

    subgraph Gateway ["Network & Security Gateway"]
        ReverseProxy["Cloud Run / Reverse Proxy & SSL"]
        RateLimiter["Rate Limiting & DDOS Filter"]
        AuthMiddleware["JWT & Google OIDC Validator\nRBAC: Player | Admin | Superadmin"]
    end

    subgraph BackendCluster ["Authoritative Backend Tier (Node.js / Express)"]
        APIGateway["/api/v1 Router"]
        AuthService["Auth & State-Code Engine"]
        EconomyService["Authoritative Dual-Currency Engine\n(CP Ledger & Virtual ₦ Wallet)"]
        ActivityService["Mini-game Scoring & Validation\n(Parade QTE, Obstacles, Stealth)"]
        WorldService["3D World State & Hydration Engine"]
        SocialService["Charisma & Dialogue Engine"]
        AdminService["Admin Operations & Audit Logger"]
        RealtimeHub["WebSocket / SSE Presence Hub"]
    end

    subgraph StorageTier ["Persistence & In-Memory Tier"]
        PostgresDB[("PostgreSQL Relational DB\n(ACID authoritativeness,\nMulti-camp ready schema,\nUsers, Wallets, Platoons, Audit)")]
        RedisCache[("Redis (Optional / High-Scale)\n- Real-time Leaderboards\n- Active Player Coords\n- Rate Limit Tokens")]
    end

    MobileClient -->|HTTPS REST / JSON| ReverseProxy
    MobileClient <-->|WSS / Real-time Sync| RealtimeHub
    AdminPortal -->|HTTPS REST / JSON| ReverseProxy

    ReverseProxy --> RateLimiter --> AuthMiddleware --> APIGateway

    APIGateway --> AuthService
    APIGateway --> EconomyService
    APIGateway --> ActivityService
    APIGateway --> WorldService
    APIGateway --> SocialService
    APIGateway --> AdminService

    AuthService --> PostgresDB
    EconomyService -->|Row-level Lock Transactions| PostgresDB
    ActivityService --> PostgresDB
    WorldService --> PostgresDB
    AdminService --> PostgresDB
    AdminService --> PostgresDB

    RealtimeHub <--> RedisCache
    EconomyService <--> RedisCache
```

---

### 1.2 Authentication & Authorization Flows (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player (Mobile Client)
    participant Google as Google Identity Services
    participant API as Corper Wee Backend
    participant DB as PostgreSQL Database

    Player->>Google: Click "Continue with Google" -> Complete OIDC Consent
    Google-->>Player: Google ID Token (JWT with verified email & sub)
    Player->>API: POST /api/v1/auth/google { idToken }
    API->>API: Verify Google Signature & Extract Claims (email, sub)
    API->>DB: Query User by google_sub OR email

    alt User Exists & Has State Code
        DB-->>API: Return User, Role, Status, State Code
        API->>API: Sign Corper Wee Session JWT (expires 7d)
        API-->>Player: 200 OK { token, user, requiresOnboarding: false }
    else User Exists & Needs State Code (or Brand New User)
        DB-->>API: User Record / Partial
        API-->>Player: 200 OK { token, requiresOnboarding: true }
        Player->>API: POST /api/v1/auth/register-state-code { stateCode: "OY/26C/5439" }
        API->>API: Validate State Code Regex (^[A-Z]{2}\/\d{2}[A-C]\/\d{4}$)
        API->>DB: Check Uniqueness & Insert User, Wallet, WaterMeter, PlatoonMember
        DB-->>API: Successfully Provisioned
        API-->>Player: 201 Created { user, wallet, platoon }
    end
```

---

### 1.3 Multiplayer Networking & Hosting Options Comparison

| Architecture Pattern | Latency | Server Cost | Implementation Complexity | Authoritativeness | Verdict for Corper Wee MVP |
|---|---|---|---|---|---|
| **A. HTTP Polling / Heartbeat + Authoritative REST (Recommended for MVP)** | 200–500ms | **Lowest** (Scale-to-zero, serverless friendly) | **Low** | **High** (All currency, drills, and purchases server-checked) | **RECOMMENDED FOR MVP.** Perfect for asynchronous camp activities, leaderboards, economy, and NPC corpers without hosting overhead. |
| **B. WebSockets (Socket.io / ws) Presence Cluster** | 50–100ms | **Moderate** (Requires persistent Node instances) | **Moderate** | **High** | **Recommended for Phase 2.** Excellent for real-time player position broadcasts, live chat, and camp bugle broadcast events. |
| **C. WebRTC Mesh / P2P Data Channels** | 20–50ms | **Low Server Cost** (Clients exchange data) | **Very High** (NAT traversal, STUN/TURN, desync) | **Zero** (Vulnerable to cheating and state desync) | **Not Recommended.** Cheating risk is too high for a competitive camp scoring game. |
| **D. Dedicated Game Server (Unity Netcode / Photon / Colyseus)** | 10–30ms | **High** (Continuous GPU/CPU VM allocation) | **High** | **Absolute** | **Future Expansion (Post-MVP)** if full real-time 3D multiplayer physics interactions (like football/volleyball matches) are added. |

**MVP Scaling Limitation:**  
The HTTP + WebSocket hybrid allows scaling to tens of thousands of active corpers because expensive 60fps physics run on the client, while the backend solely handles state checkpointing, transactions, and periodic coordinate heartbeats (5–10Hz).

---

## 2. DATABASE DESIGN (POSTGRESQL)

### 2.1 Entity Relationship Diagram (Mermaid ERD)

```mermaid
erDiagram
    camps ||--o{ platoons : contains
    camps ||--o{ locations : contains
    camps ||--o{ users : hosts
    camps ||--o{ events : schedules

    users ||--o| player_profiles : has
    users ||--o| player_characters : customizes
    users ||--o| wallets : owns
    users ||--o| water_meters : tracks
    users ||--o{ player_inventory : holds
    users ||--o{ point_transactions : records
    users ||--o{ wallet_transactions : records
    users ||--o{ activity_sessions : plays
    users ||--o{ friendships : friends_with
    users ||--o{ audit_logs : triggers

    platoons ||--o{ player_profiles : assigns
    product_categories ||--o{ products : categorizes
    products ||--o{ player_inventory : stocks
    activities ||--o{ activity_sessions : defines
    events ||--o{ event_participants : logs

    camps {
        serial id PK
        varchar slug UK
        varchar name
        varchar state
        varchar city
        boolean is_active
    }

    users {
        uuid id PK
        varchar google_sub UK
        varchar email UK
        varchar display_name
        varchar state_code UK
        enum role "PLAYER, ADMIN, SUPERADMIN"
        enum status "ACTIVE, SUSPENDED, BANNED"
        boolean is_protected
        timestamp created_at
    }

    admin_invitations {
        uuid id PK
        varchar email
        varchar token UK
        uuid invited_by_user_id FK
        boolean is_consumed
        timestamp expires_at
    }

    platoons {
        serial id PK
        int camp_id FK
        int number
        varchar name
        varchar color_hex
        bigint total_points
    }

    wallets {
        uuid user_id PK,FK
        bigint corper_points
        numeric virtual_naira
        timestamp updated_at
    }

    products {
        serial id PK
        int category_id FK
        varchar name
        numeric price_naira
        numeric water_refill_value
        int stock_quantity
        boolean is_active
    }
```

---

## 3. API CONTRACTS SPECIFICATION (`/api/v1`)

### 3.1 Module: Authentication & Registration

#### 1. `POST /api/v1/auth/google`
- **Access:** Public
- **Request Body:**
  ```json
  { "idToken": "eyJhbGciOiJSUzI1NiIs..." }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "token": "jwt_session_token",
      "user": {
        "id": "uuid",
        "email": "farlodunolusege@gmail.com",
        "displayName": "Olusege",
        "role": "SUPERADMIN",
        "stateCode": "OY/26C/5439",
        "isProtected": true
      },
      "requiresOnboarding": false
    }
  }
  ```
- **Errors:** 400 Bad Request (missing token), 401 Unauthorized (invalid signature/expired).

#### 2. `POST /api/v1/auth/register-state-code`
- **Access:** Authenticated (New User)
- **Request Body:**
  ```json
  { "stateCode": "OY/26C/5439" }
  ```
- **Validation:** Regex `^[A-Z]{2}\/\d{2}[A-C]\/\d{4}$`
- **Response (201 Created):** User successfully bound to state code, wallet initialized with starter balances.
- **Errors:** 409 Conflict (state code already registered), 422 Unprocessable Entity (malformed code).

---

### 3.2 Module: Player Character & Profile

#### 3. `GET /api/v1/players/me`
- **Access:** Authenticated (`PLAYER`, `ADMIN`, `SUPERADMIN`)
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "profile": {
        "id": "uuid",
        "displayName": "Olusege",
        "stateCode": "OY/26C/5439",
        "role": "SUPERADMIN",
        "platoon": { "id": 1, "number": 1, "name": "Platoon 1 - Stalwarts", "color": "#16a34a" },
        "level": 3,
        "charisma": 65,
        "paradeRank": "Senior Cadet"
      },
      "character": {
        "gender": "MALE",
        "skinTone": "#8D5524",
        "uniform": "khaki_7_7",
        "hairstyle": "nysc_crest_cap"
      },
      "wallet": {
        "corperPoints": 450,
        "virtualNaira": 2500.00
      },
      "waterMeter": {
        "currentLevel": 88.5
      }
    }
  }
  ```

#### 4. `PUT /api/v1/players/character`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "gender": "MALE",
    "skinTone": "#C68642",
    "hairstyle": "nysc_crest_cap",
    "uniform": "white_pt_kit"
  }
  ```
- **Response (200 OK):** Updated character configuration.

---

### 3.3 Module: Activities & Mini-Games

#### 5. `POST /api/v1/activities/parade/submit`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "sequenceId": "parade_drill_morning_01",
    "results": [
      { "command": "ATTENTION", "responseTimeMs": 210, "isCorrect": true },
      { "command": "QUICK_MARCH", "responseTimeMs": 195, "isCorrect": true },
      { "command": "HALT", "responseTimeMs": 240, "isCorrect": true },
      { "command": "SALUTE", "responseTimeMs": 180, "isCorrect": true }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "score": 480,
      "accuracy": 98.5,
      "earnedPoints": 150,
      "newCorperPoints": 600,
      "platoonBonusAwarded": 150
    }
  }
  ```

#### 6. `POST /api/v1/activities/canteen-rush/submit`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "timeTakenSeconds": 48.2,
    "obstaclesCleared": 8,
    "puddlesHit": 1,
    "staminaRemaining": 35.0
  }
  ```
- **Response (200 OK):** Authoritative validation of completion, awards CP & canteen discount token.

#### 7. `POST /api/v1/activities/water/deplete`
- **Access:** Authenticated
- **Request Body:**
  ```json
  { "deltaSeconds": 30, "movementIntensity": "RUNNING" }
  ```
- **Response (200 OK):** Returns updated `currentLevel` (e.g. 74.5%).

#### 8. `POST /api/v1/activities/water/consume`
- **Access:** Authenticated
- **Request Body:**
  ```json
  { "productId": 1 }
  ```
- **Response (200 OK):** Deducts water item from inventory and refills hydration to new percentage.

---

### 3.4 Module: Economy & Mami Market

#### 9. `GET /api/v1/market/products`
- **Access:** Authenticated
- **Response (200 OK):** Array of items (Pure Water Sachet, Chilled Bottled Water, Jollof Rice & Chicken, Indomie Noodles, NYSC Custom Vest).

#### 10. `POST /api/v1/market/buy`
- **Access:** Authenticated
- **Request Body:**
  ```json
  { "productId": 2, "quantity": 1 }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "item": { "id": 2, "name": "Cold Bottled Swan Water", "quantity": 1 },
      "wallet": { "virtualNaira": 2300.00 }
    }
  }
  ```
- **Errors:** 400 Bad Request (Insufficient virtual Naira or out of stock).

#### 11. `POST /api/v1/economy/exchange`
- **Access:** Authenticated
- **Request Body:**
  ```json
  { "pointsToConvert": 100 }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "pointsDeducted": 100,
      "nairaCredited": 1000.00,
      "newPoints": 500,
      "newNaira": 3300.00,
      "rateUsed": "10 CP = 100 ₦"
    }
  }
  ```

---

### 3.5 Module: Social & Charisma

#### 12. `POST /api/v1/social/interact`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "targetUserId": "uuid-target",
    "interactionType": "CRACK_CAMP_JOKE"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "outcome": "GREAT_SUCCESS",
      "reaction": "LAUGH_AND_HIGH_FIVE",
      "dialogue": "O boy, you funny die! You be real corper!",
      "charismaGain": 3,
      "friendshipEstablished": true
    }
  }
  ```

---

### 3.6 Module: Admin & Superadmin Operations

#### 13. `GET /api/v1/admin/dashboard`
- **Access:** `ADMIN` or `SUPERADMIN`
- **Response (200 OK):** Aggregate metrics: total registered corpers, active hydration warnings, 24h market revenue, platoon scores.

#### 14. `POST /api/v1/admin/players/:id/suspend`
- **Access:** `ADMIN` or `SUPERADMIN`
- **Validation:** If target user `is_protected == true`, operation is immediately rejected with 403 Forbidden.

#### 15. `POST /api/v1/admin/invitations`
- **Access:** **SUPERADMIN ONLY**
- **Request Body:**
  ```json
  { "email": "commandant@nysc.gov.ng" }
  ```
- **Response (201 Created):** Single-use invitation token created, expires in 48 hours.

#### 16. `GET /api/v1/admin/audit-logs`
- **Access:** **SUPERADMIN ONLY**
- **Response (200 OK):** Complete immutable log of administrative events.
