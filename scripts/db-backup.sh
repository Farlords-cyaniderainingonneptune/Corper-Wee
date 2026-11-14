#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# CORPER WEE — AUTOMATED POSTGRESQL BACKUP SCRIPT
# Creates compressed pg_dump archive + SHA-256 checksum + retention pruning.
# ============================================================================

: "${DATABASE_URL:?DATABASE_URL environment variable must be set}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/corperwee}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE_PATH="${BACKUP_DIR}/corperwee_prod_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[db-backup] Starting compressed backup at $TIMESTAMP..."
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$ARCHIVE_PATH"

sha256sum "$ARCHIVE_PATH" > "${ARCHIVE_PATH}.sha256"

if [ -n "${BACKUP_S3_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
  echo "[db-backup] Uploading encrypted backup to ${BACKUP_S3_BUCKET}..."
  aws s3 cp "$ARCHIVE_PATH" "${BACKUP_S3_BUCKET}/" --sse AES256
  aws s3 cp "${ARCHIVE_PATH}.sha256" "${BACKUP_S3_BUCKET}/" --sse AES256
fi

echo "[db-backup] Pruning local backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "corperwee_prod_*.dump*" -mtime "+${RETENTION_DAYS}" -delete

echo "[db-backup] Completed: $ARCHIVE_PATH"
