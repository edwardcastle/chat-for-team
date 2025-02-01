-- Add username display to existing messages (optional)
-- This is just documentation, actual data comes from profiles table
COMMENT ON COLUMN public.messages.user_id IS 'References auth.users.id, use profiles.username for display';