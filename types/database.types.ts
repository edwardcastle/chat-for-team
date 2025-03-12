export interface Channel {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  members: string[] | null;
  type: 'public' | 'private' | 'dm';
  participants?: string[]; // For DM channels
}

export interface Message {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  user_id: string;
}

export interface MessageWithProfile extends Message {
  profiles: {
    username: string;
  } | null;
}

export interface Profile {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface ProfileInsert {
  user_id: string;
  username: string;
  avatar_url?: string | null;
}

export interface OnlineUser {
  user_id: string;
  username?: string;
  online: boolean;
  last_seen?: string | null;
}

export interface UnreadCount {
  channel_id: string;
  user_id: string;
  count: number;
  last_read: string;
}

export interface ChannelRead {
  id: string;
  user_id: string;
  channel_id: string;
  last_read: string;
}