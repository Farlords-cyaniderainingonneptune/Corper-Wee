# Corper Wee — Production Deployment & Maintenance Guide

This guide covers everything required to deploy, monitor, back up, and maintain **Corper Wee** in production across the Backend API + WebSocket Gateway, Admin Portal, PostgreSQL 16, Redis 7, Android Release Build, and Legal Compliance.

---

## 1. Production Environment Variables

Start from `.env.example` and configure all secrets in your secret manager (Cloud Run Secret Manager, AWS Secrets Manager, or GitHub Actions Environments — never commit `.env`).

| Variable | Requirement | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables structured JSON logs, static asset caching, HSTS, strict JWT validation, and stack-trace redaction |
| `PORT` | `3000` | Express + WebSocket HTTP port |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | 64-byte random | HMAC-SHA256 signing keys (`openssl rand -base64 48`) |
| `ALLOWED_ORIGINS` | Comma-separated | Strict CORS whitelist (`https://corperwee.ng,https://admin.corperwee.ng,capacitor://localhost`) |
| `DATABASE_URL` | PostgreSQL URI | Production Postgres 16 URI with `?sslmode=require` |
| `PG_POOL_MIN` / `PG_POOL_MAX` | `2` / `20` | Database connection pool limits |
| `REDIS_URL` / `REDIS_ENABLED` | `rediss://...` / `true` | Distributed rate limiting, token revocation, and WebSocket Pub/Sub fanout |
| `METRICS_BEARER_TOKEN` | Secret string | Protects `/api/v1/metrics` Prometheus endpoint in production |
| `ERROR_WEBHOOK_URL` / `SENTRY_DSN` | Optional URL | Receives real-time server and client crash payloads |
| `BACKUP_S3_BUCKET` | Optional S3 URI | Off-site encrypted PostgreSQL backup destination |

---

## 2. PostgreSQL Production Database & Migrations

1. Provision **PostgreSQL 16** (minimum 2 vCPU, 4 GB RAM, SSD storage, TLS `sslmode=require`, daily snapshots enabled).
2. Apply the idempotent SQL schema migrations in order:
   ```bash
   export DATABASE_URL="postgresql://corperwee_app:STRONG_PW@pg-host:5432/corperwee_prod?sslmode=require"
   chmod +x scripts/db-migrate.sh
   ./scripts/db-migrate.sh
   ```
   - `001_initial_schema.sql`: Core camps, users, platoons, characters, dual-currency ledgers, hydration meters, Mami Market products/inventory, activity sessions, and audit logs.
   - `002_production_social_events_security.sql`: Account retention fields, scoped admin permissions/invitations, refresh token family rotation, idempotency records, camp events, social friendships/blocks/reports/privacy, and camp notifications.
3. Each migration records its SHA-256 checksum inside `schema_migrations` so accidental post-release edits to historical SQL files are caught before deployment.

---

## 3. Redis Deployment (Multi-Instance Scaling)

- **When Single Instance:** If running a single backend container with <500 concurrent players, `REDIS_ENABLED=false` works cleanly using in-memory buckets.
- **When Horizontally Scaled (2+ API instances):** Enable **Redis 7** (`--appendonly yes`, `maxmemory-policy allkeys-lru`, password + TLS `rediss://`).
  - Prefix convention (`REDIS_KEY_PREFIX=corperwee:prod:`):
    - `rl:*` — Synchronized auth/mutation rate limiting across all instances.
    - `revoked:*` — Immediate multi-node enforcement when an admin suspends or deletes an account.
    - `ws:broadcast` & `camp:notifications` — Pub/Sub channels fanning out WebSocket `PLAYER_MOVED`, `PLAYER_EMOTE`, and `CAMP_NOTIFICATION` events across pods.

---

## 4. Backend & Admin Portal Deployment

### Option A: Full Docker Compose Stack (Single VM / Bare Metal)
```bash
cp .env.example .env
# Populate real secrets in .env
docker compose -f deploy/docker-compose.production.yml --env-file .env up -d --build
```
- **API & Gameplay Web App:** Port `3000` (put behind Cloudflare / Nginx / Cloud Load Balancer with TLS 1.3 & WebSocket `Upgrade` headers).
- **Standalone Admin Portal:** Served on port `8081` (`deploy/nginx/admin-portal.conf`) with strict `X-Frame-Options: DENY`, CSP, immutable `/assets/` caching, and `/api/v1/` reverse proxy so Admins and Players can be hosted on isolated domains (`admin.corperwee.ng` vs `corperwee.ng`).

### Option B: Managed Containers (Cloud Run / ECS / Fly.io)
- Build using root `Dockerfile` (multi-stage Node 22 Alpine, non-root `corperwee` user, built-in `/api/v1/health/live` healthcheck).
- Configure load balancer liveness probe -> `GET /api/v1/health/live` and readiness probe -> `GET /api/v1/health/ready`.
- Ensure WebSocket timeouts are `>= 60s` (`MultiplayerGateway` sends heartbeats every `25s`).

---

## 5. Android Release Build (Google Play Store `.aab`)

Two mobile delivery paths are supported:
1. **Capacitor Android Release Wrapper (`capacitor.config.json`):**
   - App ID: `ng.corperwee.app`, HTTPS scheme (`cleartext: false`, `allowMixedContent: false`, WebView debugging disabled).
   - Generate an upload keystore once (store safely offline, never commit):
     ```bash
     keytool -genkey -v -keystore corperwee-upload-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias corperwee-release
     ```
   - Build signed Play Store App Bundle:
     ```bash
     chmod +x deploy/android/build-release.sh
     ./deploy/android/build-release.sh
     ```
     Outputs `android/app/build/outputs/bundle/release/app-release.aab` with SHA-256 verification.
2. **Unity IL2CPP Mobile Client (`/unity`):**
   - Build ARM64 IL2CPP `.aab` targeting API Level 35 (`minSdk 24`), Vulkan primary + OpenGL ES 3.2 fallback, ASTC texture compression, pointing `ApiClient` base URL to `https://corperwee.ng/api/v1`.
3. **Device Compatibility Baseline:** Verified across `360x640` budget Android (`LOW` 30 FPS / no shadows / 1x DPR), `390x844` mid-range (`MID` 1.5x DPR / 1024px shadows), and `800x1280` tablets.

---

## 6. Monitoring, Structured Logging & Error Reporting

- **Structured Logs:** In `NODE_ENV=production`, every request outputs single-line JSON (`timestamp`, `level`, `requestId`, `method`, `path`, `status`, `durationMs`, `userId`) plus `X-Request-Id` response headers for log correlation.
- **Health & Readiness Endpoints:**
  - `GET /api/v1/health/live` — Process liveness.
  - `GET /api/v1/health/ready` — Config validation, PostgreSQL URL & pool readiness, Redis status, WebSocket count.
- **Prometheus Metrics:** `GET /api/v1/metrics` exports HTTP status totals, average/p95 latency, active WebSocket connections, heap memory, and buffered error count (protected by `METRICS_BEARER_TOKEN` in production). Pre-wired in `deploy/monitoring/prometheus.yml`.
- **Error Reporting:**
  - Server exceptions (`5xx`) are captured by `TelemetryService`, redacted from public API responses, logged with an `errorId`, and optionally forwarded to `ERROR_WEBHOOK_URL` / `SENTRY_DSN`.
  - Frontend runtime/WebGL errors are captured globally by `src/utils/errorReporter.ts` and posted to `POST /api/v1/telemetry/client-error`.
  - Authorized Admins inspect live server & client telemetry via `GET /api/v1/admin/monitoring`.

---

## 7. Database Backups & Recovery Drills

- **Automated Daily Backups:** `scripts/db-backup.sh` runs via cron at `02:00 UTC` daily (also wired as the `pg-backup` container in Docker Compose), creating `--format=custom --compress=9` archives, `.sha256` checksums, optional encrypted `aws s3 cp --sse AES256` upload, and 30-day pruning.
- **Monthly Restore Drill (Staging Only):**
  ```bash
  DATABASE_URL="postgresql://user:pass@staging-pg:5432/corperwee_restore_test" \
    ./scripts/db-restore.sh /var/backups/corperwee/corperwee_prod_YYYYMMDDTHHMMSSZ.dump
  ```

---

## 8. CI/CD Pipeline

`.github/workflows/production-cicd.yml` executes automatically on pull requests and `main` pushes:
1. Installs dependencies & lints (`tsc --noEmit`) both Game/Backend and Admin Portal.
2. Runs the 180-check verification suite (`npx tsx server/test/run.ts`: functional, penetration security, and 14-step gameplay tests).
3. Verifies clean PostgreSQL 16 migrations (`001` & `002`) and migration idempotency.
4. Builds production WebGL + Admin Portal Vite bundles and Docker container image.
5. Builds & signs the Android `.aab` artifact when `ENABLE_ANDROID_RELEASE=true`.

---

## 9. Legal Compliance (Privacy Policy & Terms of Service)

- Accessible in-app directly from the Sign-In / Sign-Up modal and via standalone public URLs for Google Play Store listing submission:
  - **Privacy Policy:** `https://corperwee.ng/legal/privacy` (JSON API: `/api/v1/legal/privacy`)
  - **Terms of Service:** `https://corperwee.ng/legal/terms` (JSON API: `/api/v1/legal/terms`)
- Covers Nigeria Data Protection Act (NDPA) notice, NYSC non-affiliation disclaimer, virtual currency (non-monetary) terms, 90-day anonymized retention policy, and support contact (`farlodunolusege@gmail.com`).

---

## 10. Routine Maintenance Checklist

- **Weekly:** Review `GET /api/v1/admin/monitoring` error buffer, Prometheus p95 latency (`< 150ms`), and flagged user reports in the Admin Portal.
- **Monthly:** Run a staging backup restore test; rotate `METRICS_BEARER_TOKEN` and review active Admin staff permissions.
- **Quarterly:** Rotate `JWT_SECRET` / `JWT_REFRESH_SECRET` during a low-traffic window (`03:00 WAT`), audit dependency advisories (`npm audit`), and verify SSL/TLS certificate auto-renewal.
