-- Practice Planner — schéma Turso (libSQL / SQLite)
-- À exécuter avec : turso db shell <ton-nom-de-base> < schema.sql

CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('irish','jazz')),
  type TEXT NOT NULL CHECK (type IN ('morceau','etude','exercice')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'a_travailler' CHECK (status IN ('a_travailler','en_cours','maitrise')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS planning_sessions (
  id TEXT PRIMARY KEY,
  session_date TEXT NOT NULL,       -- format YYYY-MM-DD
  start_time TEXT NOT NULL,         -- format HH:MM
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  category TEXT NOT NULL CHECK (category IN ('irish','jazz','mixte')),
  notes TEXT,
  done INTEGER NOT NULL DEFAULT 0,  -- 0/1 (pas de booléen natif en SQLite)
  done_at TEXT,
  series_id TEXT,                   -- identifie les séances issues d'une même récurrence
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_items (
  session_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  PRIMARY KEY (session_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON planning_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_series ON planning_sessions(series_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON work_items(category);

-- Remarque : les suppressions en cascade (work_item / session supprimés)
-- sont gérées manuellement côté API (api/items.js, api/sessions.js)
-- plutôt que via ON DELETE CASCADE, pour rester fiable en HTTP stateless.
