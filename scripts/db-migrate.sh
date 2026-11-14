#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# CORPER WEE — POSTGRESQL MIGRATION RUNNER
# Applies numbered SQL migrations idempotently and records SHA-256 checksums.
# ============================================================================

: "${DATABASE_URL:?DATABASE_URL environment variable must be set}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/server/db/migrations"

echo "[db-migrate] Ensuring schema_migrations tracking table exists..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
SQL

for file in $(ls -1 "$MIGRATIONS_DIR"/*.sql | sort); do
  name="$(basename "$file")"
  checksum="$(sha256sum "$file" | awk '{print $1}')"
  already_applied="$(psql "$DATABASE_URL" -tAc "SELECT checksum FROM schema_migrations WHERE filename = '$name';")"

  if [ -n "$already_applied" ]; then
    if [ "$already_applied" != "$checksum" ]; then
      echo "[db-migrate] ERROR: Checksum mismatch for already-applied migration $name"
      exit 1
    fi
    echo "[db-migrate] Skipping $name (already applied)"
  else
    echo "[db-migrate] Applying $name..."
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO schema_migrations (filename, checksum) VALUES ('$name', '$checksum');"
    echo "[db-migrate] Applied $name cleanly."
  fi
done

echo "[db-migrate] All PostgreSQL migrations verified."
