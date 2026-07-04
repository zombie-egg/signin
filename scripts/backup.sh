#!/usr/bin/env bash
# 数据备份：PostgreSQL 全量 + MinIO 桶同步。建议 crontab 每日执行。
# 用法: ./scripts/backup.sh [备份目录]  (默认 ./backups)
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 从 .env 读取连接串（不入 git）
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

echo "[1/2] pg_dump ..."
pg_dump "${DATABASE_URL}" -Fc -f "${BACKUP_DIR}/esign_${STAMP}.dump"

echo "[2/2] MinIO 桶同步 ..."
# 需先: mc alias set local http://$MINIO_ENDPOINT:$MINIO_PORT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
mc mirror --overwrite "local/${MINIO_BUCKET:-esign}" "${BACKUP_DIR}/minio_${STAMP}"

# 保留最近 14 份
find "$BACKUP_DIR" -name 'esign_*.dump' -mtime +14 -delete || true

echo "备份完成: ${BACKUP_DIR} (${STAMP})"
