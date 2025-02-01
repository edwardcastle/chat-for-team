-- Create profiles table
CREATE TABLE public.profiles (
                                 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                                 username text UNIQUE NOT NULL,
                                 created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable"
  ON profiles FOR SELECT
                             USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
                             USING (auth.uid() = user_id)
                  WITH CHECK (auth.uid() = user_id);