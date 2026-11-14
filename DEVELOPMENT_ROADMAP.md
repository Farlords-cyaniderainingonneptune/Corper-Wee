# Corper Wee — Development Roadmap & Milestone Tracker

## Release 1.0 Milestones (Status: 13 / 13 Completed)

| Milestone | Deliverable | Status | Primary Evidence |
| :---: | :--- | :---: | :--- |
| **1** | PRD and System Architecture | ✅ Completed | `PRD.md`, `SYSTEM_ARCHITECTURE.md`, `docs/` |
| **2** | Database and API Design | ✅ Completed | `001` & `002` PostgreSQL migrations, `/api/v1` router |
| **3** | Authentication and Authorization | ✅ Completed | Email + State Code & Google Auth, JWT rotation, Scoped RBAC |
| **4** | Basic Camp Environment (WebGL + Unity) | ✅ Completed | `CampScene3D.ts`, `CampLocationSystem.ts`, `/unity` scenes |
| **5** | Character Creation and Movement | ✅ Completed | `CharacterStudio.tsx`, `ProceduralModels.ts`, Joystick & Orbit Cam |
| **6** | Parade Mini-game & Daily Duties | ✅ Completed | `ParadeMinigame.tsx`, `DailyTasksModal.tsx`, `DailyTaskService` |
| **7** | Canteen Rush | ✅ Completed | `CanteenRushMinigame.tsx`, `ActivityService.submitCanteenRush` |
| **8** | Water Hydration and Mami Market | ✅ Completed | `MamiMarketModal.tsx`, hydration drain/refill, inventory ledger |
| **9** | Points and Dual-Currency Economy | ✅ Completed | `EconomyService`, idempotent `CP -> Naira` exchange & leaderboards |
| **10** | Social Interactions & Soldier Evasion | ✅ Completed | `SocialInteractionModal.tsx`, charisma checks, `SoldierPatrolAI.ts` |
| **11** | Separate Admin Portal | ✅ Completed | `/admin-portal` (React + TS SPA), user retention & live game config |
| **12** | Multiplayer & Live Camp Feed | ✅ Completed | `MultiplayerGateway` (`/ws`), `CampNotificationFeed`, `CampEventsModal` |
| **13** | Testing & Production Preparation | ✅ Completed | **186 / 186** automated checks, Docker/Postgres/Redis/Android/CI-CD/Legal |

---

## Automated Verification Coverage

- **Functional & Admin Suite:** `92 / 92` checks passing (`server/test/backend.test.ts`)
- **Security & Penetration Suite:** `57 / 57` checks passing (`server/test/security.test.ts`)
- **End-to-End 14-Step Gameplay, Android Tiers, Observability & Daily Tasks:** `37 / 37` checks passing (`server/test/gameplay.test.ts`)
- **TypeScript Build & Lint:** Clean `vite build` (Player + Admin Portal) and `tsc --noEmit`

---

## Post-MVP Roadmap (v1.1+)

- [ ] Multi-camp expansion packs beyond Iseyin (Lagos Iyana-Ipaja, Abuja Kubwa, Rivers Nonwa-Gbam) utilizing existing `camps` schema foreign keys.
- [ ] Live Redis Pub/Sub adapter module activation (`REDIS_ENABLED=true`) for multi-pod Kubernetes/Cloud Run auto-scaling.
- [ ] Seasonal Inter-Platoon Tournament brackets & automated prize distribution.
- [ ] Voice-over pack localization (Nigerian Pidgin, Yoruba, Igbo, Hausa) building on top of Web Audio synthesizer events.
