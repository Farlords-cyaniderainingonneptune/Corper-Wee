# Corper Wee — System Architecture

## 1. Architectural Overview

Corper Wee follows a clean **Client–Server Authoritative Architecture** separating 3D simulation rendering, administrative UI, business/security services, and relational persistence.

```text
+---------------------------+        +----------------------------------+
|   Player Clients          |        |   Admin Command Portal           |
|  - WebGL / Three.js SPA   |        |  - Standalone React + TS SPA     |
|  - Capacitor Android APK  |        |  - Routes under /admin/*         |
|  - Unity Mobile (/unity)  |        |  - Zero direct DB connection     |
+-------------+-------------+        +----------------+-----------------+
              | HTTPS REST + WSS (/ws)                | HTTPS REST + Bearer JWT
              v                                       v
+-----------------------------------------------------------------------+
|                    Node.js / Express API Gateway (Port 3000)          |
|  - Security Headers, CORS Whitelist, Request-ID Correlation           |
|  - Rate Limiter (Auth / Mutation / Client Error Buckets)              |
|  - Zod Input Validation + JWT Auth & Scoped RBAC Middleware           |
+-----------------------------------+-----------------------------------+
                                    |
        +---------------------------+---------------------------+
        |                                                       |
        v                                                       v
+-------------------------------+               +-------------------------------+
|     Domain Services Layer     |               |    Real-Time WebSocket Hub    |
|  - AuthService / AuthzService |               |  - MultiplayerGateway (/ws)   |
|  - ActivityService            |               |  - 25s Ping/Pong Heartbeat    |
|  - DailyTaskService           |               |  - Movement, Emote & Social   |
|  - EconomyService             |               |  - Live Notification Push     |
|  - SocialService / EventSvc   |               +---------------+---------------+
|  - AdminService / Telemetry   |                               |
+---------------+---------------+                               |
                |                                               |
                v                                               v
+-------------------------------+               +-------------------------------+
|   Relational Persistence      |               |  Horizontal Scale (Redis 7)   |
|  - PostgreSQL 16 (Migrations) |               |  - Rate-Limit Sync            |
|  - Resilient In-Memory Store  |               |  - Token Revocation Cache     |
|    (Zero-Config Preview Mode) |               |  - WS Pub/Sub Channels        |
+-------------------------------+               +-------------------------------+
```

---

## 2. Responsibility Boundaries

| Layer | Directory / Module | Responsibilities |
| :--- | :--- | :--- |
| **Game Rendering & Input** | `src/game/` | 3D camp geometry (`CampScene3D`), avatar meshes (`ProceduralModels`, `CharacterPreview3D`), soldier patrol state machine (`SoldierPatrolAI`), adaptive DPR/shadows (`DevicePerformance`), zone navigation (`CampLocationSystem`). **Zero direct authority over wallet or leaderboards.** |
| **Player HUD & Mini-Games** | `src/components/`, `src/audio/`, `src/network/` | HUD overlay, touch joystick, Parade/Canteen/Market/Social/Events/DailyDuties modals, procedural Web Audio synthesis (`AudioSynthesizer`), WebSocket client (`MultiplayerClient`), crash reporter (`errorReporter`). |
| **Admin Portal SPA** | `admin-portal/src/` | Isolated browser app mounted on `/admin` (or standalone Nginx in production), protected via `ProtectedRoute` and role/permission guards (`StaffManagementPage`, `EconomyPage`, `UsersPage`, etc.). |
| **Backend API & Services** | `server/` | Express controllers, Zod schemas, rate limiters, domain business rules, double-entry transaction recording, audit logging, Prometheus metrics, and WebSocket gateway. |
| **Deployment & Automation** | `deploy/`, `scripts/`, `.github/workflows/` | Multi-stage Dockerfile, Docker Compose production stack, Nginx Admin reverse proxy, `db-migrate.sh`, `db-backup.sh`, `db-restore.sh`, Android `.aab` build pipeline, GitHub Actions CI/CD. |

---

## 3. Architectural Decisions & Rationale

1. **Authoritative Server State:** All score formulas, exchange rates, inventory deductions, and daily duty eligibility execute inside `server/services/*`, preventing modified mobile/web clients from awarding arbitrary points.
2. **Dual Storage Mode (`PostgreSQL` + In-Memory Fallback):** Production deployments connect to PostgreSQL 16 using `DATABASE_URL` and versioned SQL migrations (`001` & `002`), while the zero-config relational mirror keeps automated tests (`186` checks) and sandbox previews fast and self-contained.
3. **Separate Admin Build Target:** `vite.config.ts` compiles both `index.html` and `admin.html`, and `/admin-portal` also maintains an independent Vite build (`admin-portal/package.json`) so administrators can be hosted behind stricter network/Nginx policies in production.
4. **Procedural Assets & Web Audio:** Using procedural Three.js geometry and Web Audio API synthesis eliminates heavy external `.glb`/`.mp3` payload downloads, ensuring fast load times on constrained mobile networks.
