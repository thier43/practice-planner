-- Migration : support des séances récurrentes
-- À exécuter avec : node run-schema.js <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN> migration_002_recurring_sessions.sql

ALTER TABLE planning_sessions ADD COLUMN series_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_series ON planning_sessions(series_id);
