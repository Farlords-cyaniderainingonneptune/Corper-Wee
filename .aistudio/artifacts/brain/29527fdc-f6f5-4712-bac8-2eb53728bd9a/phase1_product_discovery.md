# PHASE 1: PRODUCT DISCOVERY & TECHNICAL ARCHITECTURAL ANALYSIS
**Project:** Corper Wee  
**Role:** Senior Game Product Manager & Principal Technical Architect  
**Setting:** NYSC Orientation Camp, Iseyin, Oyo State, Nigeria  

---

## 1. CORE GAMEPLAY LOOPS

The game is structured across three concentric gameplay loops to drive engagement, retention, and social immersion:

```
+----------------------------------------------------------------------------------------------------+
| MACRO LOOP (21-Day Orientation Camp Cycle & Season Progression)                                     |
|  - Registration & Platoon Induction -> Daily Camp Schedule -> Inter-Platoon Championship Cup       |
|  - Rank Progression: "Otondo" -> "Jambito" -> "White Feather" -> "Commandant's Pride"             |
|  - Passing Out Parade (POP) & Final Camp Valedictory                                               |
+----------------------------------------------------------------------------------------------------+
                                                  ^
                                                  |
+----------------------------------------------------------------------------------------------------+
| MESO LOOP (Daily Camp Routine & Resource Circulation)                                              |
|  - Morning Parade Drills (Earn CP) -> Canteen Rush & Chow Time (Stamina)                           |
|  - Hydration Survival (Refill at Mami Market with Virtual Naira) -> Soldier Evasion (Curfew)       |
|  - Socialization & Charisma Building -> Platoon Leaderboard Updates                                |
+----------------------------------------------------------------------------------------------------+
                                                  ^
                                                  |
+----------------------------------------------------------------------------------------------------+
| MICRO LOOP (Immediate Moment-to-Moment Engagement: 30s - 3min)                                     |
|  - 3D Navigation & Movement (Joystick/Sprint/Jump)                                                 |
|  - QTE Parade Command Reaction (Visual/Audio cue -> Timing Window -> CP Reward)                    |
|  - Obstacle Avoidance (Hop puddles, dodge barricades, sprint management)                           |
|  - Dialogue & Charisma Check (Approach corper -> Choose reply -> Slapstick reaction / Friendship)   |
|  - Instant Hydration Consume (Drink sachet water -> restore speed gauge)                          |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. FEATURE TAXONOMY: PRIMARY VS. SECONDARY

| Category | Primary Features (Core to Experience) | Secondary Features (Enrichment) |
|---|---|---|
| **Identity & Onboarding** | Google OAuth + NYSC State Code verification (`OY/26C/5439`); 3D Character customizer (gender, skin tone, NYSC Khaki 7/7, White-on-White PT kit). | Custom hairstyles, sunglasses, waist bag accessories, custom swagger walk animations. |
| **World & Navigation** | Explorable 3D Iseyin Camp (Parade Ground, Mami Market, Canteen, Hostels, Camp Gate); 3D third-person camera & virtual joystick; HUD minimap. | Day/night lighting transitions, dynamic camp weather (sunny heat vs sudden downpour), compass waypoint breadcrumbs. |
| **Gameplay Activities** | Parade Ground rhythm QTE drill commands; Canteen Rush obstacle course; Avoid the Soldiers stealth patrol; Water meter depletion & refill. | Platoon tug-of-war, volleyball/football mini-games, early morning bugle drill alarms. |
| **Economy & Commerce** | Dual-currency ledger: Corper Points (CP) and Virtual Naira (₦); CP-to-₦ Camp Bank exchange; Mami Market item buying (sachet/bottled water, Indomie, snacks). | Cosmetic vendor stalls, item resale/trading, promotional daily deals from Mami market mamas. |
| **Social & Charisma** | Charisma stat (1-100); NPC/Corper dialogue tree with charisma checks; Slapstick reactions (cartoon slap/punch); In-game contact card exchange. | Friends list presence indicators, camp gossip board, shared platoon chat/emotes. |
| **Platoon System** | 10 Platoons with assigned colors; Platoon aggregate scoring; Real-time Camp Leaderboard. | Platoon anthem chanting buffs, platoon uniform sash customization. |
| **Administration** | Separate Web Admin Portal; Superadmin bootstrap (`farlodunolusege@gmail.com`); Player management (search/suspend); Economy balancing (exchange rate & price controls); Audit logs. | Live event broadcast banner, automated scheduled daily drills, CSV export of camp census. |

---

## 3. REQUIRED GAME SYSTEMS

1. **Identity & Authorization Engine:**
   - Google OIDC verification + State Code regex & uniqueness checks.
   - Three-tier Role-Based Access Control (`PLAYER`, `ADMIN`, `SUPERADMIN`) with database-enforced immutability for the primary superadmin.
2. **3D Scene & Rendering Engine:**
   - Three.js WebGL viewport with PBR shading, soft contact shadows, directional sun/sky lighting, and mobile-optimized geometry budgets.
3. **Player Controller & Kinematics System:**
   - Third-person camera with smooth exponential damping, dual-axis virtual joystick, sprint acceleration, jump kinematics, and collision detection against camp structures.
4. **Authoritative Activity & Scoring System:**
   - Server-validated mini-game sessions: rhythm parade command evaluation, obstacle time verification, and stealth detection calculations.
5. **Survival & Hydration System:**
   - Time- and action-based hydration drain engine tied to movement speed debuffs and inventory water consumption triggers.
6. **Authoritative Dual-Currency Ledger:**
   - ACID-compliant transaction engine managing balance mutability, CP-to-₦ conversion rates, item purchases, and anti-tamper ledgers.
7. **Social & Charisma Engine:**
   - Dialogue decision tree with probabilistic charisma roll resolver, non-graphic slapstick animation triggers, and mutual consent buddy exchange.
8. **Administrative & Governance System:**
   - Single-use invite token lifecycle, real-time telemetry dashboard, product pricing & stock editor, and immutable audit logging.

---

## 4. USER ROLES & PERMISSION MATRIX

```
+-------------------+---------------------------------------------------------------------------------+
| ROLE              | PERMISSIONS & BOUNDARIES                                                        |
+-------------------+---------------------------------------------------------------------------------+
| PLAYER            | - Create & customize personal corper avatar.                                    |
|                   | - Explore 3D camp, play mini-games, earn CP, exchange to Virtual ₦.             |
|                   | - Buy items at Mami Market, drink water, converse with corpers.                |
|                   | - View personal wallet, inventory, platoon leaderboard, and minimap.            |
|                   | - CANNOT: Modify currency directly, access admin routes, view raw PII.          |
+-------------------+---------------------------------------------------------------------------------+
| ADMIN             | - Access protected Admin Portal dashboard and camp telemetry.                   |
|                   | - Search & inspect registered corpers (view State Code, Platoon, Status).       |
|                   | - Suspend/unsuspend players; adjust platoon assignments.                        |
|                   | - Modify Mami Market catalog: add/edit items, adjust prices, restock.           |
|                   | - Adjust CP-to-₦ conversion exchange rates and activity reward parameters.       |
|                   | - Create and schedule camp-wide events.                                         |
|                   | - CANNOT: Suspend/modify Superadmin, invite new Admins, wipe audit logs.         |
+-------------------+---------------------------------------------------------------------------------+
| SUPERADMIN        | - Immutable account (`farlodunolusege@gmail.com`, `OY/26C/5439`).               |
|                   | - All Admin permissions + Exclusive Superadmin capabilities:                    |
|                   | - Issue single-use, time-expiring cryptographic Admin invitation tokens.       |
|                   | - Revoke/suspend Admin privileges and inspect staff access.                     |
|                   | - Full access to immutable Administrative Audit Trail.                         |
|                   | - Protected against suspension, deletion, or demotion by any actor.             |
+-------------------+---------------------------------------------------------------------------------+
```

---

## 5. FEATURE DEPENDENCIES MAP

```
[Google OAuth + State Code Verification]
        |
        v
[User Account & Authoritative Wallet Initialized]
        |
        +---> [Platoon Auto-Assignment] ----------> [Platoon Leaderboard System]
        |
        +---> [Character Creator Studio] ---------> [3D Avatar Spawning in Camp]
                                                            |
                               +----------------------------+----------------------------+
                               |                                                         |
                               v                                                         v
                 [Parade Ground & Mini-Games]                                [Hydration System]
                               |                                                         |
                               v (Earns CP)                                              v (Depletes Water)
                 [Camp Bank Currency Exchange]                               [Needs Refill Items]
                               |                                                         |
                               v (Converts to ₦)                                         |
                 [Mami Market Commerce] <------------------------------------------------+
                               |
                               +---> Purchases Sachet/Bottled Water -> Restores Hydration
                               +---> Purchases Outfits -> Boosts Charisma Stat
                                                              |
                                                              v
                                                [Social Interactions & Friendship]
```

---

## 6. TECHNICAL CHALLENGES & MITIGATIONS

| Challenge | Risk Description | Architectural Mitigation |
|---|---|---|
| **1. 3D WebGL Performance on Mobile** | Complex 3D environments cause thermal throttling and sub-30fps drops on mobile browsers. | Use low-poly stylized geometry assembled from modular primitives; share materials; implement camera frustum culling; disable post-processing bloom on low-tier devices; cap physics steps at 60Hz. |
| **2. Client-Side Currency Tampering** | Attackers intercepting or editing local memory/variables to inflate CP or Virtual ₦. | **Zero-trust client architecture**: The client never sends balances. The client only submits action timestamps and input events. The server validates the game session and awards currency authoritatively into the database. |
| **3. High-Frequency State Synchronization** | Frequent position and hydration updates flooding the backend API. | Decouple local 60fps simulation from network sync: batch position updates at 5-10Hz; simulate hydration drain locally with periodic server heartbeat reconciliation. |
| **4. Race Conditions in Economy** | Double-spending during simultaneous CP conversion and Mami Market checkout. | Wrap financial mutations in PostgreSQL ACID transactions with row-level locks (`SELECT ... FOR UPDATE` on `wallets`). |
| **5. State Code Spoofing** | Users claiming arbitrary NYSC state codes or colluding with duplicates. | Server-side canonical regex enforcement (`^[A-Z]{2}\/\d{2}[A-C]\/\d{4}$`), database unique constraint, and verification state flags. |

---

## 7. POTENTIAL PERFORMANCE BOTTLENECKS

1. **Draw Call Overload in Three.js:**
   - Multiple separate meshes for camp tents, fences, and hostel windows create CPU-bound draw call bottlenecks.
   - *Fix:* Group static camp structures into single composite geometries or use `THREE.InstancedMesh` for repeated props (stalls, barrels, lamp posts, trees).
2. **Texture Memory Footprint:**
   - Large individual image textures overload mobile GPU VRAM.
   - *Fix:* Procedural canvas textures and lightweight color palettes rather than heavy external image assets.
3. **React Re-Render Interference:**
   - React state changes triggering canvas rebuilds or interrupting the `requestAnimationFrame` loop.
   - *Fix:* Mount the Three.js viewport in a decoupled container; communicate between Three.js and React HUD via lightweight event emitters / mutable refs.

---

## 8. SECURITY RISKS & HARDENING

1. **Superadmin Hijacking or Deletion:**
   - Hardcode an immutable DB protection constraint ensuring `email = 'farlodunolusege@gmail.com'` can never be updated, demoted, suspended, or deleted through API controllers.
2. **Privilege Escalation via Admin APIs:**
   - Implement strict role verification middleware (`verifyRole('ADMIN')` and `verifyRole('SUPERADMIN')`) checking the DB-backed user record, not untrusted JWT claims.
3. **Single-Use Invite Token Replay:**
   - Admin invitation tokens are cryptographically randomized (UUIDv4/SHA-256), stored with an `is_consumed` boolean and an expiration timestamp (e.g. 48 hours). Tokens are invalidated within the same atomic transaction as admin provisioning.
4. **Input Sanitization & Injection:**
   - Parameterized SQL queries via Drizzle ORM / pg client; strict Zod schema validation on all incoming payload bodies.

---

## 9. SCOPE DEFINITION: MVP VS. FUTURE EXPANSION

### 9.1 MVP Scope (Playable Camp Experience)
- **Authentication & Setup:**
  - Google Sign-in flow + State Code validation (`OY/26C/5439` Superadmin auto-seed).
  - 3D Character customizer with NYSC Khaki 7/7 and White PT kit options.
  - Platoon auto-assignment (Platoons 1–10).
- **3D Camp World:**
  - Interactive 3D Iseyin Camp (Parade Ground, Mami Market, Canteen, Hostels, Camp Gate, Borehole Water Point).
  - Third-person avatar navigation (joystick/keyboard), camera damping, and circular HUD minimap.
- **Core Activities (Playable):**
  - **Parade Ground QTE:** Real-time drill commands (Attention, Stand at Ease, Quick March, Halt, Salute) with accuracy scoring and CP rewards.
  - **The Canteen Rush:** Obstacle run (puddles, barriers, stamina meter, time countdown).
  - **Avoid the Soldiers:** Stealth evasion zone with soldier patrol sight cones and comedic consequences.
  - **Water Management:** Real-time hydration depletion and replenishment via Mami Market items.
- **Economy & Mami Market:**
  - Dual wallet (CP & Virtual ₦) with authoritative conversion.
  - Mami Market vendor with purchases (pure water, bottled water, Indomie, snacks).
- **Social System:**
  - Approach corpers, trigger charisma checks, view comedic slapstick reactions, and exchange contact cards.
- **Platoon Standings:**
  - Live camp leaderboard displaying aggregate points for Platoons 1 through 10.
- **Admin Portal (Standalone):**
  - Superadmin dashboard with real-time stats, player search/suspension, economy exchange rate slider, product price/stock manager, single-use invite generator, and audit log viewer.

### 9.2 Deferred to Future Releases (Post-MVP)
- Real-time multiplayer WebSocket synchronization for >50 simultaneous players on one canvas.
- Multi-camp expansion (NYSC camps in Keffi, Ede, Iyana-Ipaja, Kubwa).
- Spatial voice chat and camp radio station broadcasting.
- Full 3D ragdoll physics simulations.
- Mobile native app store packaging (React Native / Unity export wrapper).

---

## 10. FEATURE PRIORITY MATRIX

```
HIGH VALUE
  ^
  |  [P0: Parade QTE Drills]          [P0: Google Auth + State Code]
  |  [P0: 3D Camp World & Avatar]      [P0: Dual Currency & Mami Market]
  |  [P0: Hydration Survival System]   [P0: Superadmin Seed & Protection]
  |  [P1: Canteen Rush Obstacles]      [P1: Separate Admin Portal UI]
  |  [P1: Avoid Soldiers Stealth]      [P1: Charisma & Slapstick Social]
  |--------------------------------------------------------------------
  |  [P2: Platoon Anthem Audio]        [P2: Day/Night Weather Shifts]
  |  [P3: Volleyball Mini-game]        [P3: Multi-Camp Expansion]
  |  [P3: Spatial Proximity Audio]     [P3: Inter-Camp Tournaments]
  +--------------------------------------------------------------------> HIGH EFFORT
```

---

## 11. MISSING REQUIREMENTS IDENTIFIED & PROPOSED IMPROVEMENTS

1. **Camp Culture Audio Identity (Proposed):**
   - *Requirement Gap:* The original prompt mentions audio effects but does not specify camp acoustic traditions.
   - *Improvement:* Introduce a Web Audio procedural synthesizer generating authentic military bugle calls ("Wake Up Call", "Lights Out", "Fall In") and military parade drum cadences.
2. **Corper Nickname / Call-Up Identity (Proposed):**
   - *Requirement Gap:* State codes are formal, but camp life relies on personal call-ups and nicknames.
   - *Improvement:* Allow players to set a "Camp Nickname" (e.g. "Oga Corper", "Otilo", "Alhaji") that displays over their 3D avatar alongside their platoon badge.
3. **Hydration Emergency Notification (Proposed):**
   - *Requirement Gap:* The prompt states that zero water reduces stamina, but players might miss gradual depletion.
   - *Improvement:* Provide screen-edge heat haze shader pulses and a prompt ("Oga, water don finish! Locate a water vendor!") when hydration falls below 25%.
4. **Admin Economic Simulation / Anomaly Alarms (Proposed):**
   - *Requirement Gap:* Admins need to know if players exploit CP farming.
   - *Improvement:* Include velocity flags in the Admin Dashboard highlighting players earning CP at abnormal rates (>500 CP/minute).

---

## 12. TECHNICAL RISK ASSESSMENT & MITIGATION MATRIX

| Risk ID | Risk Category | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|---|
| **TR-01** | Device GPU Bottlenecks | HIGH | MEDIUM | Target low-poly composite 3D assets, share standard materials, clamp pixel ratio to 1.5, and provide a 30fps/60fps performance toggle. |
| **TR-02** | Currency State Inconsistency | CRITICAL | LOW | Isolate currency transactions in atomic database blocks with row-level locks and strict check constraints (`CHECK (virtual_naira >= 0)`). |
| **TR-03** | Unauthorized Admin Escalation | CRITICAL | LOW | Superadmin identity statically guaranteed for `farlodunolusege@gmail.com`. Admin invitations require cryptographically secure, single-use hashes. |
| **TR-04** | Input Latency on Mobile Web | MEDIUM | MEDIUM | Custom touch joystick with touch-identifier tracking, zero debounce on jump/action buttons, and optimistic client movement with server checkpointing. |
| **TR-05** | Audio Autoplay Restrictions | LOW | HIGH | Initialize Web Audio Context on the user's first explicit interaction (e.g., clicking "Start Camp Life" on the Title Screen). |
