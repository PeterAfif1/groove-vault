-- Update rudiments table with new columns
ALTER TABLE rudiments ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Uncategorized';
ALTER TABLE rudiments ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Seed Data: Professional Grooves
INSERT INTO rudiments (name, sticking, target_bpm, category, video_url) 
VALUES 
('Linear Funk Fill', 'RLK RLK RL', 140, 'Funk', 'https://example.com/linear-funk'),
('Syncopated Swing', 'R LH R R LH', 180, 'Jazz', 'https://example.com/sync-swing'),
('Heavy Tom Cascade', 'R L K K R L', 160, 'Rock', 'https://example.com/tom-cascade'),
('Ghost Note Groove', 'R l l R l l R l', 110, 'Technique', 'https://example.com/ghost-notes'),
('Double Bass Burner', 'R L R L K K', 200, 'Metal', 'https://example.com/double-bass')
ON CONFLICT DO NOTHING;
