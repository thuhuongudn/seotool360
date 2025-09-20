#!/usr/bin/env bash
set -euo pipefail

# Ensure libpq binaries available when installed via Homebrew (macOS)
PATH="/opt/homebrew/opt/libpq/bin:$PATH"

preset_source_db="${SOURCE_SUPABASE_DB_URL:-}"
preset_target_db="${SUPABASE_DB_URL:-}"

if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
else
  echo "❌ Missing .env.local"
  exit 1
fi

if [[ -n "$preset_source_db" ]]; then
  SOURCE_SUPABASE_DB_URL="$preset_source_db"
fi

if [[ -n "$preset_target_db" ]]; then
  SUPABASE_DB_URL="$preset_target_db"
fi

required=(SOURCE_SUPABASE_DB_URL SUPABASE_DB_URL)
for v in "${required[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "❌ Missing $v in .env.local"
    exit 1
  fi
done

SOURCE_DB="$SOURCE_SUPABASE_DB_URL"
TARGET_DB="$SUPABASE_DB_URL"

mask() {
  local s="$1"
  local n=${#s}
  if (( n > 12 )); then
    printf '%s******%s\n' "${s:0:6}" "${s: -4}"
  else
    printf '********\n'
  fi
}

echo "SOURCE_DB=$(mask "$SOURCE_DB")"
echo "TARGET_DB=$(mask "$TARGET_DB")"

command -v pg_dump >/dev/null || { echo "❌ pg_dump not found"; exit 1; }
command -v psql >/dev/null || { echo "❌ psql not found"; exit 1; }

TABLES=(
  "public.admin_audit_log"
  "public.internal_link_suggestions"
  "public.profiles"
  "public.seo_tools"
  "public.social_media_posts"
  "public.tool_executions"
  "public.tool_settings"
  "public.user_tool_access"
)

SEQUENCES=(
  "public.internal_link_suggestions_id_seq"
  "public.social_media_posts_id_seq"
)

SCHEMA_OBJECTS=("${TABLES[@]}" "${SEQUENCES[@]}")

mkdir -p dumps

printf '📦 Dumping SCHEMA (selected tables)...\n'
SCHEMA_ARGS=()
for obj in "${SCHEMA_OBJECTS[@]}"; do
  SCHEMA_ARGS+=("--table=$obj")
done
pg_dump "$SOURCE_DB" --no-owner --no-acl --schema-only "${SCHEMA_ARGS[@]}" > dumps/schema.sql

printf '📦 Dumping DATA (selected tables)...\n'
DATA_ARGS=()
for t in "${TABLES[@]}"; do
  DATA_ARGS+=("--table=$t")
done
pg_dump "$SOURCE_DB" --no-owner --no-acl --data-only "${DATA_ARGS[@]}" > dumps/data.sql

record_counts() {
  local phase="$1"
  local outfile="dumps/${phase}_counts.csv"
  local non_empty_flag="false"
  > "$outfile"

  for t in "${TABLES[@]}"; do
    local reg
    reg=$(psql "$TARGET_DB" -v ON_ERROR_STOP=1 -X -At -c "SELECT to_regclass('$t');" 2>/dev/null || true)
    reg=${reg//$'\n'/}
    if [[ -z "$reg" ]]; then
      printf '%s,%s\n' "$t" "missing" >> "$outfile"
      continue
    fi

    local res
    res=$(psql "$TARGET_DB" -v ON_ERROR_STOP=1 -X -At -c "SELECT COUNT(*)::bigint FROM $t;" 2>/dev/null || true)
    res=${res//$'\n'/}
    if [[ -z "$res" ]]; then
      res="error"
    fi
    printf '%s,%s\n' "$t" "$res" >> "$outfile"
    if [[ "$res" != "0" && "$res" != "error" ]]; then
      non_empty_flag="true"
    fi
  done

  if [[ "$phase" == "pre" ]]; then
    PRE_NON_EMPTY="$non_empty_flag"
  fi

  printf '%s\n' "$outfile"
}

printf '🔍 Checking TARGET table status...\n'
PRE_NON_EMPTY="false"
pre_file=$(record_counts pre)
if [[ -s "$pre_file" ]]; then
  printf '👉 Rows in TARGET before restore (saved to %s)\n' "$pre_file"
  cat "$pre_file"
fi

if [[ "$PRE_NON_EMPTY" == "true" ]]; then
  read -r -p "⚠️ Target tables already contain data. Overwrite with dump? [y/N] " ans
  [[ ${ans:-N} =~ ^[Yy]$ ]] || { echo "❎ Cancelled"; exit 0; }
else
  read -r -p "⚠️ Target will be populated for the first time. Continue? [y/N] " ans
  [[ ${ans:-N} =~ ^[Yy]$ ]] || { echo "❎ Cancelled"; exit 0; }
fi

printf '🧹 Resetting target objects (tables/sequences)...\n'
psql "$TARGET_DB" -v ON_ERROR_STOP=1 -X <<'SQL'
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'public.user_tool_access',
    'public.tool_settings',
    'public.tool_executions',
    'public.social_media_posts',
    'public.seo_tools',
    'public.profiles',
    'public.internal_link_suggestions',
    'public.admin_audit_log'
  ] LOOP
    EXECUTE format('DROP TABLE IF EXISTS %s CASCADE;', tbl);
  END LOOP;

  FOREACH tbl IN ARRAY ARRAY[
    'public.social_media_posts_id_seq',
    'public.internal_link_suggestions_id_seq'
  ] LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %s CASCADE;', tbl);
  END LOOP;
END;
$$;
SQL

printf '🛠 Restoring SCHEMA to TARGET...\n'
psql "$TARGET_DB" -v ON_ERROR_STOP=1 -X -f dumps/schema.sql

printf '🛠 Restoring DATA to TARGET (constraints relaxed)...\n'
psql "$TARGET_DB" -v ON_ERROR_STOP=1 -X <<'SQL'
BEGIN;
SET session_replication_role = replica;
\i dumps/data.sql
SET session_replication_role = DEFAULT;
COMMIT;
SQL

printf '✅ Restore done. Running validation...\n'
post_file=$(record_counts post)
if [[ -s "$post_file" ]]; then
  printf '📊 Rows in TARGET after restore (saved to %s)\n' "$post_file"
  cat "$post_file"
fi

printf '🔐 RLS / rowsecurity for selected tables:\n'
psql "$TARGET_DB" -v ON_ERROR_STOP=1 -X <<'SQL'
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE (schemaname, tablename) IN (
  ('public','admin_audit_log'),
  ('public','internal_link_suggestions'),
  ('public','profiles'),
  ('public','seo_tools'),
  ('public','social_media_posts'),
  ('public','tool_executions'),
  ('public','tool_settings'),
  ('public','user_tool_access')
)
ORDER BY 1,2;

SELECT pol.schemaname, pol.tablename, pol.policyname, pol.cmd
FROM pg_policies pol
WHERE (schemaname, tablename) IN (
  ('public','admin_audit_log'),
  ('public','internal_link_suggestions'),
  ('public','profiles'),
  ('public','seo_tools'),
  ('public','social_media_posts'),
  ('public','tool_executions'),
  ('public','tool_settings'),
  ('public','user_tool_access')
)
ORDER BY 1,2,3;
SQL

printf '🎉 Selective mirage completed.\n'
