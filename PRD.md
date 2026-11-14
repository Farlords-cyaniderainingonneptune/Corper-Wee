# Corper Wee — Product Requirements Document (PRD)

## 1. Product Goal
Deliver a culturally grounded, mobile-performant 3D NYSC Iseyin Orientation Camp simulation where Nigerian youth (and diaspora players) experience orientation camp life, earn platoon glory, manage hydration and virtual Naira, and socialize safely—governed by a secure, separate administrative operations portal.

---

## 2. MVP Functional Requirements (Release 1.0 Baseline)

### 2.1 Player Onboarding & Profile
- **FR-01 (Sign Up / Sign In):** Players authenticate using Email + NYSC State Code (`XX/YY[A-C]/NNNN`) or Google ID Token + State Code. Email and State Code enforce strict 1-to-1 uniqueness.
- **FR-02 (Platoon Assignment):** New players are automatically assigned to Platoon `1–10`.
- **FR-03 (Character Creation):** Players customize Gender (`MALE` / `FEMALE`), Skin Tone, Hairstyle (`BUZZ_CUT`, `AFRO_FADE`, `BRAIDS`, `CORNROWS`, `LOW_TAPER`), Hair Color, Uniform (`KHAKI_FULL`, `WHITE_PT`, `PLATOON_JERSEY`), Footwear, and Accessories, persisted across reloads.

### 2.2 Camp Exploration & Mobile Controls
- **FR-04 (Third-Person Movement):** Smooth walking, sprinting, jumping, orbit camera rotation, collision checks, and animation blending via keyboard (`WASD` + `Space` + `Shift`) and mobile dynamic touch joystick/buttons.
- **FR-05 (Adaptive Android Performance):** Auto-detect hardware specs into `LOW` (budget Android, 30 FPS cap, shadows off, `1.0x` DPR), `MID` (`1.5x` DPR, 1024px shadow map), and `HIGH` (`2.0x` DPR, 2048px soft shadows) with manual HUD override.

### 2.3 Core Mini-Games & Daily Duties
- **FR-06 (Parade Drill):** Command-based rhythm QTE with `EASY`, `NORMAL`, and `HARD` difficulties, audio cues, late/wrong/missed deductions, accuracy ratings (`S`–`F`), and authoritative CP awards.
- **FR-07 (Canteen Rush):** Timed obstacle course featuring bench jumps, mud puddles, sprint management, and server-validated time/obstacle scoring.
- **FR-08 (Soldier Evasion):** Autonomous camp patrols with line-of-sight detection cones, suspicion buildup, pursuit state, and capture CP penalties.
- **FR-09 (Daily Morning Drill & Evening Parade):** Scheduled daily duties triggering shift notification alerts and rewarding bonus CP (`+50 CP` / `+60 CP`) once per calendar day.

### 2.4 Hydration, Economy & Mami Market
- **FR-10 (Hydration System):** Water meter depletes faster while sprinting (`runPerSec` vs `idlePerSec`), reducing movement speed below critical threshold; restored at the Borehole or by consuming purchased drinks.
- **FR-11 (Dual-Currency Economy):** Convert Corper Points (`CP`) to Virtual Naira (`₦`) using live configurable exchange rates (`default: 10 CP -> ₦100`).
- **FR-12 (Mami Market):** Browse active products, buy water/food/clothing with idempotency protection, and maintain player inventory.

### 2.5 Social, Multiplayer & Live Feed
- **FR-13 (Multiplayer & Social):** WebSocket `JOIN` / `MOVE` / `EMOTE` / `SOCIAL_INTERACT` synchronization, charisma-checked dialogues (including comedic failure outcomes), friend requests, user blocking, safety reporting, and privacy settings.
- **FR-14 (Camp Notification Feed):** Real-time ticker displaying camp joins, parade medals, daily duty alerts, and milestones.
- **FR-15 (Camp Events):** View scheduled orientation events, join sessions, and claim participation CP/Naira bonuses.

### 2.6 Separate Admin Portal (`/admin`)
- **FR-16 (Staff Security & Invitations):** Superadmin issues time-limited, single-use, permission-scoped Admin invitations and can suspend, reactivate, or revoke staff access.
- **FR-17 (User Governance):** Search players, inspect detailed stats/transactions, suspend/reactivate accounts, and soft-delete accounts under 90-day anonymization retention policies.
- **FR-18 (Live Camp Operations):** CRUD management for Mami Market items/prices, exchange rates, mini-game reward/penalty rules, platoons, 3D camp locations, scheduled events, audit logs, and live monitoring telemetry.

---

## 3. Non-Functional Requirements
- **Performance:** Target `>= 30 FPS` on 2 GB RAM / `360×640` budget Android phones and `60 FPS` on mid-range hardware.
- **Security:** Strict RBAC separation, server-enforced validation, SQLi/IDOR protection, rate limiting, HTTPS/WSS in production, and zero exposure of secrets or direct DB connections in the Admin Portal.
- **Compliance:** Embedded Privacy Policy and Terms of Service (`/legal/privacy`, `/legal/terms`), NDPA data anonymization support, and non-monetary virtual currency disclaimers.
