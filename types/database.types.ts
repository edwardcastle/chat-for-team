export interface Profile {
  user_id: string;
  username: string;
  created_at?: string;
  updated_at?: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  members?: string[];
  type: 'public' | 'private' | 'dm';
  participants?: string[];
}

export interface MessageWithProfile {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  user_id: string;
  user: {} | null;
}

export interface OnlineUser {
  user_id: string;
  username?: string;
  online: boolean;
  last_seen?: string;
}


export type ProfileInsert = Pick<Profile, 'user_id' | 'username'>;
