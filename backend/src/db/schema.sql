-- =============================================================
-- Groove Vault — complete database setup
-- Safe to run on a fresh database or an existing one.
-- =============================================================

-- -------------------------------------------------------------
-- rudiments
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rudiments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  sticking   VARCHAR(100) NOT NULL,
  target_bpm INTEGER      NOT NULL CHECK (target_bpm > 0),
  category   VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
  video_url  TEXT
);

-- Unique name so seed inserts are idempotent
CREATE UNIQUE INDEX IF NOT EXISTS rudiments_name_key ON rudiments (name);

-- -------------------------------------------------------------
-- practice_logs
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS practice_logs (
  id          SERIAL PRIMARY KEY,
  rudiment_id INTEGER      NOT NULL REFERENCES rudiments (id) ON DELETE CASCADE,
  date        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  current_bpm INTEGER      NOT NULL CHECK (current_bpm > 0),
  notes       TEXT
);

-- Index for the window-function query (PARTITION BY rudiment_id ORDER BY date DESC)
CREATE INDEX IF NOT EXISTS practice_logs_rudiment_date_idx
  ON practice_logs (rudiment_id, date DESC);

-- -------------------------------------------------------------
-- Migrations — safe on both fresh and existing databases
-- -------------------------------------------------------------
ALTER TABLE rudiments ADD COLUMN IF NOT EXISTS category  VARCHAR(100) DEFAULT 'Uncategorized';
ALTER TABLE rudiments ADD COLUMN IF NOT EXISTS video_url TEXT;

-- -------------------------------------------------------------
-- Seed data — skipped if name already exists
-- -------------------------------------------------------------
INSERT INTO rudiments (name, sticking, target_bpm, category, video_url)
VALUES
  ('Linear Funk Fill',   'RLK RLK RL',     140, 'Funk',      'https://example.com/linear-funk'),
  ('Syncopated Swing',   'R LH R R LH',    180, 'Jazz',      'https://example.com/sync-swing'),
  ('Heavy Tom Cascade',  'R L K K R L',    160, 'Rock',      'https://example.com/tom-cascade'),
  ('Ghost Note Groove',  'R l l R l l R l', 110, 'Technique', 'https://example.com/ghost-notes'),
  ('Double Bass Burner', 'R L R L K K',    200, 'Metal',     'https://example.com/double-bass')
ON CONFLICT (name) DO NOTHING;
