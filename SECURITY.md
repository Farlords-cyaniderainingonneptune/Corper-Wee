# Corper Wee — Security Architecture & Controls

All security controls are verified continuously in CI and locally via the 57-check penetration test suite (`server/test/security.test.ts`).

---

## 1. Authentication & Token Hygiene

- **JWT Signing & Validation:** Access tokens (`15m`) use HMAC-SHA256 verification; unsigned, `alg=none`, malformed, or signature-tampered tokens are rejected (`401`).
- **Refresh Token Rotation & Reuse Detection:** Refresh tokens are stored hashed (`SHA-256`) alongside a `familyId`. Consumed tokens rotate cleanly; replaying an already-rotated token revokes the entire token family immediately.
- **Immediate Revocation Enforcement:** Every authenticated request verifies `user.status === 'ACTIVE'`. Suspended or retention-deleted accounts have existing valid JWTs rejected immediately (`403`).
- **Identity Uniqueness:** Registration enforces strict 1-to-1 binding between `email` and `stateCode` (`409 Conflict` on cross-pairing).

## 2. Authorization & Role-Based Access Control (RBAC)

- **Role Separation:** Signup payloads attempting `role: "SUPERADMIN"` or `"ADMIN"` are ignored (`PLAYER` enforced).
- **Protected Superadmin Invariant:** Seeded Superadmin (`isProtected: true`) cannot be demoted, suspended, or deleted (`403`).
- **Scoped Admin Permissions:** Invited admins only receive explicit permission flags assigned by the Superadmin (`MANAGE_PLAYERS`, `SUSPEND_PLAYERS`, `MANAGE_ECONOMY`, `SCHEDULE_EVENTS`, `VIEW_AUDIT_LOGS`), enforced by `requirePermission(...)`.
- **Single-Use Expiring Invitations:** Invitations verify matching invitee email (`403` mismatch), expiration (`410 Gone`), revocation (`403`), and consume atomically (`409` on reuse).

## 3. Anti-Cheat, Financial Integrity & Abuse Prevention

- **Server-Side Bounds:** All mini-game submissions enforce realistic bounds (`<= 50` parade commands, `0..60000ms` latency, `3..600s` Canteen Rush, `1..300s` stealth duration) returning `422` on manipulation.
- **Idempotency Keys:** `POST /economy/exchange` and `POST /market/buy` record `idempotencyKey` responses so duplicate submissions credit/debit only once.
- **Daily Duty Replay Lock:** Daily `MORNING_DRILL` and `EVENING_PARADE` bonuses reject duplicate same-day claims (`409`).
- **IDOR Prevention:** Friend request responses verify the authenticated caller is the intended `friendUserId` recipient (`403`).
- **Input Validation & SQLi Defense:** Strict Zod schemas reject non-integer path IDs (`400`) and malformed inputs (`422`); SQL parameter payloads in search fields are safely escaped as literals.
- **Rate Limiting:** Endpoint-specific sliding-window buckets protect `/auth/*`, mutations, and telemetry ingestion (`429 Too Many Requests` + `Retry-After`).

## 4. WebSocket, Production Headers & Compliance

- **Authenticated WebSocket JOIN:** Unauthenticated or `userId`-spoofed `JOIN` frames close immediately with custom codes `4001` / `4003`.
- **Production HTTP Hardening:** `x-powered-by` disabled, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (`DENY` on Admin Nginx), `Strict-Transport-Security`, CORS `ALLOWED_ORIGINS` whitelist, and stack-trace redaction in `NODE_ENV=production`.
- **Privacy & Retention:** `DELETE /api/v1/admin/players/:id` anonymizes PII (`email`, `displayName`, `stateCode`), preserves immutable financial ledgers for `90` days, and logs an immutable `AuditLog` entry.
