#!/bin/bash
echo "Running migrations to update expiry logic..."

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "Error: SUPABASE_DB_URL not set"
    echo "Usage: SUPABASE_DB_URL='postgres://...' ./run-migrations.sh"
    exit 1
fi

echo "1. Updating consume_token function..."
psql "$SUPABASE_DB_URL" -f scripts/03-create-daily-token-usage.sql

echo "2. Updating consume_token with logging..."
psql "$SUPABASE_DB_URL" -f scripts/11-update-consume-token-with-logging.sql

echo "3. Updating scheduled expiry job..."
psql "$SUPABASE_DB_URL" -f scripts/05-setup-expiry-scheduled-job.sql

echo "✅ All migrations completed!"
