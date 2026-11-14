# Changelog

All notable changes to **Corper Wee** are documented in this file.

---

## [1.0.0] — 2026-11-14

### Added
- **Dynamic Weather System:** Implemented periodic cycling across `Sunny` (`+65%` hydration drain), `Cloudy` (overcast haze, `1.0x` hydration), and `Light Rain` (`-40%` hydration drain, `0.94x` damp-ground pace, tier-scaled Three.js rainfall particles, and Web Audio rainfall wash), synchronized across `CampScene3D`, `AudioSynthesizer`, `CampHUD`, and backend `/activities/water/deplete`.
- **Daily Parade Duties System:** Implemented `Morning Drill` (`06:00–11:00 WAT`, `+50 CP`) and `Evening Parade` (`16:30–19:30 WAT`, `+60 CP`) task tracking (`DailyTaskService`), shift bugle alerts (`DAILY_TASK_ALERT`), HUD duty button/banner, and automated Parade Drill bonus unlocking.
- **Production Deployment & DevOps Suite:**
  - Multi-stage non-root `Dockerfile`, `docker-compose.production.yml` (PostgreSQL 16, Redis 7, API, Nginx Admin Portal, Prometheus, automated daily backup cron).
  - PostgreSQL migration `002_production_social_events_security.sql` and shell runners (`db-migrate.sh`, `db-backup.sh`, `db-restore.sh`).
  - Capacitor Android release config (`capacitor.config.json`) and signed `.aab` build script (`deploy/android/build-release.sh`).
  - GitHub Actions CI/CD workflow (`.github/workflows/production-cicd.yml`).
  - Structured JSON request logging (`X-Request-Id`), `TelemetryService`, Prometheus `/api/v1/metrics`, `/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/admin/monitoring`, and client crash reporting (`errorReporter.ts`).
  - Authoritative Privacy Policy and Terms of Service (`/legal/privacy`, `/legal/terms`, `/api/v1/legal/*`, and in-app `LegalModal`).
- **Gameplay & Android Responsiveness:**
  - `DevicePerformance` (`LOW`, `MID`, `HIGH`) adaptive rendering tiers and HUD toggle.
  - `CampEventsModal` for joining orientation events and claiming participation rewards.
  - Real-time `CampNotificationFeed` + WebSocket `CAMP_NOTIFICATION` broadcast.
  - Zone & Time-of-Day (`MORNING`, `DAY`, `NIGHT`) reactive procedural Web Audio soundscapes and 3D lighting.
- **Verification & Security:**
  - Consolidated 186-check test runner (`server/test/run.ts`) covering functional (`92`), security/penetration (`57`), and 14-step gameplay/Android/production/daily-task checks (`37`).
- **Project Documentation:**
  - Established full root documentation suite (`README.md`, `PROJECT_OVERVIEW.md`, `PRD.md`, `SYSTEM_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `API_DOCUMENTATION.md`, `GAMEPLAY_DESIGN.md`, `SECURITY.md`, `DEVELOPMENT_ROADMAP.md`, `CHANGELOG.md`, and `docs/DEPLOYMENT_AND_MAINTENANCE_GUIDE.md`).

### Fixed
- Guarded initial client session check against missing local access tokens to prevent unauthenticated `401` fetches on cold load.
- Filtered Express `[API]` request logger output to exclude Vite dev-mode source module requests.
- Synchronized frontend `ApiService` endpoints, character preset normalization, and mini-game ref captures with backend schemas.
