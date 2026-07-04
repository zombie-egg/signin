#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -n "${POSTGRES_CONNECTION_STRING:-}" ]; then
    export DATABASE_URL="$POSTGRES_CONNECTION_STRING"
  elif [ -n "${POSTGRES_URI:-}" ]; then
    export DATABASE_URL="$POSTGRES_URI"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Missing DATABASE_URL. On Zeabur set DATABASE_URL=\${POSTGRES_CONNECTION_STRING} or DATABASE_URL=\${POSTGRES_URI}."
  exit 1
fi

if [ -z "${REDIS_HOST:-}" ] && [ -n "${REDIS_CONNECTION_STRING:-}" ]; then
  redis_url="${REDIS_CONNECTION_STRING#redis://}"
  redis_auth_host="${redis_url%@*}"
  redis_host_port_db="${redis_url#*@}"

  if [ "$redis_auth_host" != "$redis_url" ]; then
    export REDIS_PASSWORD="${REDIS_PASSWORD:-${redis_auth_host#*:}}"
  else
    redis_host_port_db="$redis_url"
  fi

  redis_host_port="${redis_host_port_db%%/*}"
  export REDIS_HOST="${REDIS_HOST:-${redis_host_port%%:*}}"
  if [ "$redis_host_port" != "${redis_host_port##*:}" ]; then
    export REDIS_PORT="${REDIS_PORT:-${redis_host_port##*:}}"
  else
    export REDIS_PORT="${REDIS_PORT:-6379}"
  fi
fi

if [ -z "${MINIO_ACCESS_KEY:-}" ] && [ -n "${MINIO_ROOT_USER:-}" ]; then
  export MINIO_ACCESS_KEY="$MINIO_ROOT_USER"
fi

if [ -z "${MINIO_SECRET_KEY:-}" ] && [ -n "${MINIO_ROOT_PASSWORD:-}" ]; then
  export MINIO_SECRET_KEY="$MINIO_ROOT_PASSWORD"
fi

required_vars="JWT_ACCESS_SECRET JWT_REFRESH_SECRET STORAGE_KEY_ENC_SECRET"
for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "Missing $var_name. Add it in Zeabur service Variables."
    exit 1
  fi
done

if [ "${#STORAGE_KEY_ENC_SECRET}" -ne 64 ]; then
  echo "STORAGE_KEY_ENC_SECRET must be exactly 64 hex characters."
  exit 1
fi

pnpm exec prisma db push --skip-generate

if [ "${SEED_ON_START:-true}" = "true" ]; then
  pnpm seed
fi

exec node dist/main.js
