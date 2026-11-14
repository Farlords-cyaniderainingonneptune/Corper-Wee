# Corper Wee — Project Overview

## 1. Executive Summary
**Corper Wee** is a mobile-first 3D life-simulation and social role-playing game set in Nigeria's **NYSC Orientation Camp at Iseyin, Oyo State**. Designed for mid-range Android devices and desktop browsers, it transforms everyday camp experiences—morning bugle drills, canteen sprints, soldier evasion, Mami Market hustling, and platoon rivalry—into an engaging multiplayer social world backed by an authoritative server architecture.

---

## 2. Core Product Pillars

1. **Authentic Iseyin Camp Atmosphere**
   - Faithful spatial layout featuring the Parade Ground, Camp Canteen, Mami Market, Borehole Water Station, Lecture Pavilion, Male & Female Hostels, and Admin HQ.
   - Dynamic Morning / Day / Night lighting cycles matched with zone-specific ambient audio (morning bugle, market bustle, distant chatter, night crickets).

2. **Server-Authoritative Progression & Anti-Cheat Integrity**
   - Every point award, currency conversion, Mami Market purchase, hydration change, daily duty bonus, and event reward is validated and persisted server-side.
   - Idempotency keys and strict numeric bounds eliminate replay exploits and client-side score tampering.

3. **Social Camaraderie & Platoon Competition**
   - Platoons `1–10` compete on a live championship leaderboard driven by member drills, daily duties, and obstacle course runs.
   - Real-time multiplayer movement, emotes (`SALUTE`, `WAVE`, `CHEER`), charisma-based NPC/player dialogue, friendships, blocking, and privacy controls.

4. **Zero-Release Live Operations (Admin Command Portal)**
   - Authorized camp administrators adjust conversion rates, mini-game rewards/penalties, market products/prices, camp events, and world locations live without forcing a client app update.

---

## 3. Stakeholders & Roles

| Role | Access Scope |
| :--- | :--- |
| **Player (`PLAYER`)** | Gameplay client (WebGL / Android), character studio, mini-games, daily duties, economy, social hub |
| **Camp Admin (`ADMIN`)** | Scoped access to Admin Portal (`/admin`) via Superadmin invitation (e.g., `MANAGE_PLAYERS`, `SUSPEND_PLAYERS`, `MANAGE_ECONOMY`, `SCHEDULE_EVENTS`, `VIEW_AUDIT_LOGS`) |
| **Superadmin (`SUPERADMIN`)** | Immutable protected camp commandant (`farlodunolusege@gmail.com`) with full administrative oversight, staff role promotion, and scoped admin invitation issuance/revocation |

---

## 4. Technology Stack Summary

- **Player Frontend:** React 19, TypeScript, Tailwind CSS v4, Three.js WebGL engine, procedural Web Audio synthesizer, `lucide-react` HUD.
- **Native Mobile Targets:** Capacitor Android Release Wrapper (`ng.corperwee.app` `.aab`) + Unity C# Mobile Client scripts (`/unity`).
- **Admin Command Portal:** Dedicated React 19 + TypeScript + React Router v7 SPA (`/admin-portal`), communicating strictly via authenticated REST APIs.
- **Backend & Real-Time Layer:** Node.js 22, Express, `ws` WebSocket gateway (`/ws`), Zod request validation, HMAC-SHA256 JWT + rotating refresh token store.
- **Database & Scaling Readiness:** PostgreSQL 16 schemas & migrations (`001`, `002`) with resilient zero-config in-memory relational fallback for local preview; Redis 7 topology for distributed pub/sub and rate limiting; Prometheus metrics & structured JSON logs.
