export interface Profile {
  user_id: string;
  username: string;
  created_at?: string;
  updated_at?: string;
}

export type ProfileInsert = Pick<Profile, 'user_id' | 'username'>;
