#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# CORPER WEE — VERIFIED POSTGRESQL RESTORE SCRIPT
# Usage: DATABASE_URL=... ./scripts/db-restore.sh /path/to/archive.dump
# ============================================================================

: "${DATABASE_URL:?DATABASE_URL environment variable must be set}"
ARCHIVE_PATH="${1:?Provide path to .dump backup file}"

if [ ! -f "$ARCHIVE_PATH" ]; then
  echo "[db-restore] ERROR: Backup file not found: $ARCHIVE_PATH"
  exit 1
fi

if [ -f "${ARCHIVE_PATH}.sha256" ]; then
  echo "[db-restore] Verifying SHA-256 checksum..."
  sha256sum -c "${ARCHIVE_PATH}.sha256"
fi

echo "[db-restore] Restoring $ARCHIVE_PATH into target database..."
pg_restore \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  "$ARCHIVE_PATH"

echo "[db-restore] Restore completed successfully."
