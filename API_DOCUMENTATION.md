# Corper Wee — API & WebSocket Documentation

Base REST URL: `/api/v1`  
WebSocket Endpoint: `/ws`  
Response envelope: `{ "status": "success", "data": ... }` or `{ "status": "error", "message": "...", "requestId": "..." }`.

Protected routes require header: `Authorization: Bearer <accessToken>`.

---

## 1. Health, Observability & Legal

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | Basic service health & uptime |
| `GET` | `/api/v1/health/live` | Public | Container liveness probe |
| `GET` | `/api/v1/health/ready` | Public | Readiness probe (config, Postgres URL, Redis, WS count) |
| `GET` | `/api/v1/metrics` | Bearer Token (Prod) | Prometheus/OpenMetrics instrumentation |
| `POST` | `/api/v1/telemetry/client-error` | Public (Rate-Limited) | Client runtime error telemetry ingestion (`202`) |
| `GET` | `/api/v1/legal/privacy` | Public | Privacy Policy JSON (HTML at `/legal/privacy`) |
| `GET` | `/api/v1/legal/terms` | Public | Terms of Service JSON (HTML at `/legal/terms`) |

## 2. Authentication

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/authenticate` | Public (Rate-Limited) | Email + State Code sign-in/sign-up (aliases: `/login`, `/signup`) |
| `POST` | `/api/v1/auth/google` | Public (Rate-Limited) | Google ID Token + optional State Code sign-in |
| `POST` | `/api/v1/auth/accept-invitation` | Public (Rate-Limited) | Redeem single-use Admin invitation token |
| `POST` | `/api/v1/auth/register-state-code` | JWT | Complete onboarding State Code assignment |
| `POST` | `/api/v1/auth/refresh` | Public (Rate-Limited) | Rotate refresh token & issue new JWT pair |
| `POST` | `/api/v1/auth/logout` | Public | Revoke active refresh session |

## 3. Players, Characters & Platoons

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/config/game` | JWT | Fetch live economy, reward & hydration config |
| `GET` | `/api/v1/players/me` | JWT | Authenticated player profile, wallet, water & character |
| `GET` | `/api/v1/players/:id` | JWT | Public corper profile |
| `PUT` | `/api/v1/players/character` | JWT | Persist customized 3D avatar appearance |
| `GET` | `/api/v1/platoons` | JWT | List platoons `1–10` |
| `GET` | `/api/v1/platoons/leaderboard` | JWT | Ranked platoon championship standings |
| `GET` | `/api/v1/platoons/:id` | JWT | Platoon details and member roster |

## 4. Activities, Daily Duties & Hydration

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/activities/daily-tasks` | JWT | Today's `MORNING_DRILL` & `EVENING_PARADE` status (`?timeOfDay=MORNING\|DAY\|NIGHT`) |
| `POST` | `/api/v1/activities/daily-tasks/alert` | JWT | Trigger deduplicated shift bugle notification alert |
| `POST` | `/api/v1/activities/daily-tasks/complete` | JWT | Claim daily duty reward (`+50 CP` / `+60 CP`, `409` on duplicate) |
| `POST` | `/api/v1/activities/parade/submit` | JWT | Validate Parade Drill commands (optional `daily_*` sequence bonus) |
| `POST` | `/api/v1/activities/canteen-rush/submit` | JWT | Validate obstacle course completion (`3s–600s` bounds) |
| `POST` | `/api/v1/activities/stealth/report` | JWT | Record soldier evasion survival CP or capture penalty |
| `POST` | `/api/v1/activities/water/deplete` | JWT | Server-authoritative hydration depletion tick |
| `POST` | `/api/v1/activities/water/consume` | JWT | Consume inventory water item to refill hydration |

## 5. Economy & Mami Market

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/market/products` | JWT | List active Mami Market items |
| `POST` | `/api/v1/market/buy` | JWT | Idempotent market purchase (`productId`, `quantity`, `idempotencyKey`) |
| `GET` | `/api/v1/market/inventory` | JWT | Retrieve player's owned items |
| `POST` | `/api/v1/economy/exchange` | JWT | Idempotent `CP -> Virtual Naira` conversion |
| `GET` | `/api/v1/wallet/transactions` | JWT | Dual-currency wallet & point transaction history |

## 6. World, Social & Camp Events

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/world/locations` | JWT | Active 3D Iseyin camp location zones |
| `GET` | `/api/v1/world/locations/:id` | JWT | Single location zone details |
| `GET` | `/api/v1/world/corpers` | JWT | Nearby corper NPCs/players |
| `GET` | `/api/v1/world/notifications` | JWT | Recent camp notification feed items |
| `POST` | `/api/v1/social/interact` | JWT | Dialogue & charisma check resolution |
| `GET` | `/api/v1/social/friends` | JWT | Accepted & pending friend connections |
| `POST` | `/api/v1/social/friends/request` | JWT | Send friend request |
| `POST` | `/api/v1/social/friends/respond` | JWT | Accept/reject incoming request (recipient ownership enforced) |
| `POST` | `/api/v1/social/block` | JWT | Block another user |
| `POST` | `/api/v1/social/report` | JWT | File moderation report |
| `GET` / `PUT` | `/api/v1/social/privacy` | JWT | Read/update interaction & visibility privacy settings |
| `GET` | `/api/v1/events` | JWT | List scheduled & active camp events |
| `POST` | `/api/v1/events/:id/join` | JWT | Register for event |
| `POST` | `/api/v1/events/:id/claim-reward` | JWT | Claim event participation CP & Virtual Naira bonus |

## 7. Admin & Superadmin Operations (`/api/v1/admin/*`)

Requires `ADMIN` or `SUPERADMIN` role plus granular permission (`MANAGE_PLAYERS`, `SUSPEND_PLAYERS`, `MANAGE_ECONOMY`, `SCHEDULE_EVENTS`, `VIEW_AUDIT_LOGS`):
- **Dashboard & Monitoring:** `GET /admin/dashboard`, `GET /admin/activities`, `GET /admin/audit-logs`, `GET /admin/monitoring`
- **User Governance:** `GET /admin/players`, `GET /admin/players/:id`, `POST /admin/players/:id/status`, `DELETE /admin/players/:id` (90-day retention soft-delete), `POST /admin/reports/:id/resolve`
- **Live Game Config & Economy:** `GET /admin/config`, `PUT /admin/config`, `PUT /admin/economy/rates`
- **Market, Locations, Platoons & Events:** CRUD endpoints under `/admin/market/products`, `/admin/locations`, `/admin/platoons`, `/admin/events`
- **Superadmin Exclusive:** `GET /admin/staff`, `POST /admin/players/:id/role`, `PUT /admin/staff/:id/permissions`, `POST /admin/invitations`, `POST /admin/invitations/:id/revoke`

## 8. WebSocket Protocol (`/ws`)

- **Client -> Server:**
  - `JOIN`: `{ type: "JOIN", data: { token, userId, stateCode, displayName, platoonNumber, posX, posY, posZ, rotationY } }` (JWT validated; forged/impersonated sockets closed with `4001`/`4003`)
  - `MOVE`: `{ type: "MOVE", data: { x, y, z, rotationY, isSprinting } }`
  - `EMOTE`: `{ type: "EMOTE", data: { emote: "SALUTE" | "WAVE" | "CHEER" } }`
  - `SOCIAL_INTERACT`: `{ type: "SOCIAL_INTERACT", data: { targetUserId, interactionType, dialogueOptionId } }`
  - `PONG`: Heartbeat reply every `25s`
- **Server -> Client:**
  - `ROOM_INIT`, `PLAYER_JOINED`, `PLAYER_MOVED`, `PLAYER_EMOTE`, `PLAYER_LEFT`, `SOCIAL_INTERACTION_RESULT`, `SOCIAL_INTERACTION_RECEIVED`, `CAMP_NOTIFICATION`, `PING`
