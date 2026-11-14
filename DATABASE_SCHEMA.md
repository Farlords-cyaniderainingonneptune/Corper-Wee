# Corper Wee — Database Schema Documentation

PostgreSQL 14+/16 production schemas live in:
- `server/db/migrations/001_initial_schema.sql` (Core identity, camp world, economy, inventory, activities, audit logs)
- `server/db/migrations/002_production_social_events_security.sql` (Retention policies, scoped admin permissions, refresh token families, idempotency keys, events, social graph, notifications)

Applied idempotently in production via `./scripts/db-migrate.sh` (checksum-verified in `schema_migrations`).

---

## 1. Entity Relationship Overview

```text
camps (1) ──< platoons (N) ──< player_profiles (N) >── (1) users
users (1) ── (1) player_characters
users (1) ── (1) wallets ──< wallet_transactions / point_transactions
users (1) ── (1) water_meters
users (1) ──< player_inventory >── (1) products >── (1) product_categories
users (1) ──< activity_sessions
users (1) ──< refresh_tokens
users (1) ──< admin_invitations
users (N) ──< friendships / user_blocks / user_reports / user_privacy_settings
camp_events (1) ──< event_participants >── (1) users
```

---

## 2. Core Tables Reference

### Identity, Security & Administration
- **`users`**: `id (UUID PK)`, `google_sub`, `email (UNIQUE)`, `display_name`, `avatar_url`, `state_code (UNIQUE)`, `role (PLAYER | ADMIN | SUPERADMIN)`, `status (ACTIVE | SUSPENDED | BANNED | PENDING_REGISTRATION | DELETED)`, `is_protected`, `custom_permissions (JSONB)`, `deleted_at`, `retention_until`, `last_login_at`.
  - *Retention Anonymization:* Soft deletion clears `state_code`, anonymizes `email` & `display_name`, revokes refresh tokens, and retains anonymized ledgers for `90` days (`retention_until`).
- **`refresh_tokens`**: `id`, `user_id`, `token_hash (UNIQUE)`, `family_id`, `is_revoked`, `replaced_by_token_hash`, `expires_at` — supports refresh token rotation with family-wide revocation on reuse detection.
- **`admin_invitations`**: `id`, `email`, `token (UNIQUE)`, `invited_by_user_id`, `assigned_role`, `permissions (JSONB)`, `status (PENDING | ACCEPTED | REVOKED | EXPIRED)`, `is_consumed`, `expires_at`, `revoked_at`, `revoke_reason`.
- **`idempotency_records`**: `key (PK)`, `user_id`, `action`, `response_payload (JSONB)`, `expires_at` — guarantees single execution of `/economy/exchange` and `/market/buy`.
- **`audit_logs`**: Immutable append-only administrative log recording `actor_user_id`, `action`, `target_entity`, `target_id`, `metadata (JSONB)`, `ip_address`, `created_at`.

### Camp World, Platoons & Players
- **`camps`**: `id`, `slug`, `name`, `state`, `city`, `is_active` (Seeded: `iseyin-oyo`).
- **`platoons`**: `id`, `camp_id`, `number (1..10)`, `name`, `color_hex`, `motto`, `total_points`.
- **`player_profiles`**: `user_id (PK)`, `platoon_id`, `level`, `experience_points`, `charisma_score (1..100)`, `reputation_score`, `parade_rank`, `total_parades_completed`, `camp_nickname`.
- **`player_characters`**: `user_id (PK)`, `gender`, `skin_tone_hex`, `hairstyle`, `hair_color_hex`, `uniform_type`, `footwear`, `accessory`.
- **`locations`**: `id`, `camp_id`, `slug`, `name`, `category`, `pos_x`, `pos_y`, `pos_z`, `trigger_radius`, `description`, `is_active`, `is_deleted`.

### Economy, Hydration & Activities
- **`wallets`**: `user_id (PK)`, `corper_points (>= 0)`, `virtual_naira (>= 0.00)`.
- **`point_transactions`**: Immutable ledger of CP credits/debits (`amount`, `balance_after`, `activity_type`, `description`, `created_at`).
- **`wallet_transactions`**: Immutable ledger of Virtual Naira movements (`EARN_ACTIVITY`, `PENALTY_ACTIVITY`, `CP_EXCHANGE`, `MARKET_PURCHASE`, `ADMIN_ADJUSTMENT`).
- **`water_meters`**: `user_id (PK)`, `current_level (0.00..100.00)`, `last_depleted_at`, `updated_at`.
- **`product_categories`** & **`products`**: Mami Market catalog (`price_naira`, `water_refill_value`, `stamina_boost_value`, `charisma_boost_value`, `stock_quantity`, `icon_key`, `is_active`).
- **`player_inventory`**: `user_id`, `product_id`, `quantity (> 0)`, `is_equipped` (`UNIQUE(user_id, product_id)`).
- **`activity_sessions`**: Completed mini-game history (`activity_slug`, `score`, `points_awarded`, `accuracy_percentage`, `duration_seconds`, `completed_at`).
- **Daily Tasks State (`daily_task_completions` / `DailyTaskCompletion`)**: Keyed `(userId, dateKey, taskType)` tracking `MORNING_DRILL` and `EVENING_PARADE` daily bonus grants and preventing duplicate daily claims.

### Social, Events & Notifications
- **`friendships`**: `(user_id, friend_user_id)`, `status (PENDING | ACCEPTED | REJECTED)`, `relationship_score (0..100)`.
- **`user_blocks`** & **`user_reports`**: Player safety graph and Admin moderation queue (`OPEN | RESOLVED | DISMISSED`).
- **`user_privacy_settings`**: Per-player opt-in/out controls (`allow_interactions`, `allow_friend_requests`, `show_online_status`).
- **`camp_events`** & **`event_participants`**: Scheduled camp events, participant limits, reward values (`reward_cp`, `reward_naira`), and `reward_claimed` tracking.
- **`camp_notifications`**: Real-time notification feed (`CAMP_JOIN`, `MEDAL_EARNED`, `ACTIVITY_RECORD`, `EVENT_UPDATE`, `SOCIAL_MILESTONE`, `DAILY_TASK_ALERT`).
- **`game_settings`**: Dynamic JSONB key-value live configuration (`conversion_rate`, `parade_rewards`, `canteen_rewards`, `stealth_config`, `hydration_drain`).
