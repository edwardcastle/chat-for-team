export interface Profile {
  user_id: string;
  username: string;
  created_at?: string;
  updated_at?: string;
}


export type Channel = {
  id: string;
  name: string;
  type: 'dm' | 'group';
  participants: string[];
  created_at: string;
  updated_at: string;
};


export type ProfileInsert = Pick<Profile, 'user_id' | 'username'>;
