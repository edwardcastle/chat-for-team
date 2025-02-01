-- Add foreign key to messages table
ALTER TABLE messages
ADD CONSTRAINT messages_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(user_id)
ON DELETE CASCADE;

-- Optional: Add index for better performance
CREATE INDEX idx_messages_user_id ON messages(user_id);