# Corper Wee

**Corper Wee** is an interactive 3D life-simulation and social RPG set at the NYSC Orientation Camp in **Iseyin, Oyo State, Nigeria**. Players register with a unique email and NYSC-format State Code, customize a 3D avatar, join a camp platoon, explore Iseyin Orientation Camp in third-person 3D, manage hydration and virtual currency, compete in camp mini-games, socialize in real time over WebSockets, and stay on top of daily camp duties—supported by a standalone React Admin Command Portal and authoritative Node.js/Express API.

---

## Core Experience

- **Authentication & Onboarding:** Unique 1-to-1 Email + NYSC State Code registration (`^[A-Z]{2}/\d{2}[A-C]/\d{4}$`), Google OAuth verification support, JWT access + rotating refresh token families, and automatic Platoon `1–10` assignment.
- **3D Orientation Camp (Three.js + WebGL):** Interactive Iseyin camp world with Parade Ground, Camp Canteen, Mami Market, Water Borehole, Lecture Pavilion, Male & Female Hostels, Soldier Patrol zones, Time-of-Day lighting (`MORNING`, `DAY`, `NIGHT`), adaptive `LOW` / `MID` / `HIGH` Android WebGL quality tiers, interactive minimap fast-travel, and zone-reactive procedural Web Audio soundscapes.
- **Mini-Games & Daily Duties:**
  - **Parade Drill:** Rhythm command-response mini-game with `EASY` / `NORMAL` / `HARD` cadences and authoritative scoring.
  - **Canteen Rush:** Timed obstacle course with jumps, mud-puddle dodges, and hydration drain.
  - **Soldier Evasion:** Patrol AI with vision cones, suspicion meter, chase state, and capture penalties.
  - **Daily Morning Drill & Evening Parade Tasks:** Scheduled camp duties with bugle shift alerts and daily Corper Point bonuses.
- **Dual-Currency Economy & Mami Market:** Earn Corper Points (CP), convert CP to Virtual Naira (`₦`), purchase hydrating drinks, camp meals, and uniform accessories with idempotent ledgers, and manage camp hydration.
- **Multiplayer & Social Systems:** Real-time WebSocket presence, movement/emote synchronization, live Camp Notification Feed, charisma checks, friendships, blocking, user reporting, and privacy toggles.
- **Standalone Admin Portal (`/admin` & `/admin-portal`):** Role-based administrative dashboard for player moderation, 90-day retention deletion, live economy & activity configuration, platoon/location/event/market management, audit logs, monitoring, and Superadmin-only scoped staff invitations.

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install
cd admin-portal && npm install && cd ..

# 2. Start Full-Stack Server (Express + Vite Game + /admin Portal on port 3000)
npm run dev

# 3. Verify TypeScript, Security, Functional & Gameplay Suites (186 checks)
npm run lint
npx tsx server/test/run.ts
```

- **Player WebGL App:** `http://localhost:3000`
- **Admin Command Portal:** `http://localhost:3000/admin`
- **API v1 Root:** `http://localhost:3000/api/v1`
- **WebSocket Gateway:** `ws://localhost:3000/ws`
- **Legal Policies:** `http://localhost:3000/legal/privacy` & `http://localhost:3000/legal/terms`

---

## Project Documentation Index

| Document | Scope |
| :--- | :--- |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Vision, target audience, pillars, and deliverables summary |
| [PRD.md](./PRD.md) | Product requirements, MVP definition, and acceptance criteria |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Layered architecture, WebGL + Unity clients, API, WebSocket & Admin Portal |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Relational PostgreSQL schema (`001` & `002`), ledgers, and retention rules |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Complete REST API v1 & WebSocket protocol reference |
| [GAMEPLAY_DESIGN.md](./GAMEPLAY_DESIGN.md) | 3D camp zones, controls, mini-games, daily duties, AI, soundscape & economy |
| [SECURITY.md](./SECURITY.md) | Authentication, RBAC, anti-cheat validation, idempotency & audit logs |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | Milestones 1–13 completion status & post-MVP backlog |
| [CHANGELOG.md](./CHANGELOG.md) | Chronological version & milestone release history |
| [Deployment Guide](./docs/DEPLOYMENT_AND_MAINTENANCE_GUIDE.md) | Production Docker, PostgreSQL, Redis, Android `.aab`, monitoring & backups |
