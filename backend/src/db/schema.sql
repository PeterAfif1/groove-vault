-- Create tables
CREATE TABLE IF NOT EXISTS rudiments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sticking VARCHAR(255) NOT NULL,
  target_bpm INTEGER NOT NULL,
  category VARCHAR(100) DEFAULT 'Uncategorized',
  video_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_logs (
  id SERIAL PRIMARY KEY,
  rudiment_id INTEGER REFERENCES rudiments(id) ON DELETE CASCADE,
  current_bpm INTEGER NOT NULL,
  notes TEXT,
  date TIMESTAMP DEFAULT NOW()
);

-- Seed Data: Professional Grooves
INSERT INTO rudiments (name, sticking, target_bpm, category, video_url)
VALUES
('Linear Funk Fill', 'RLK RLK RL', 140, 'Funk', 'https://example.com/linear-funk'),
('Syncopated Swing', 'R LH R R LH', 180, 'Jazz', 'https://example.com/sync-swing'),
('Heavy Tom Cascade', 'R L K K R L', 160, 'Rock', 'https://example.com/tom-cascade'),
('Ghost Note Groove', 'R l l R l l R l', 110, 'Technique', 'https://example.com/ghost-notes'),
('Double Bass Burner', 'R L R L K K', 200, 'Metal', 'https://example.com/double-bass')
ON CONFLICT DO NOTHING;
