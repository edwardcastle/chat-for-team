/*
  # Add default channels
  
  1. New Data
    - Adds default channels:
      - general: Main discussion channel
      - random: Channel for random conversations
      - announcements: Channel for important announcements
  
  2. Changes
    - Inserts initial channel data
*/

INSERT INTO channels (name, description)
VALUES 
  ('general', 'Main discussion channel'),
  ('random', 'Channel for random conversations'),
  ('announcements', 'Channel for important announcements')
ON CONFLICT (name) DO NOTHING;