export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          username: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          username: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          username?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      online_users: {
        Row: {
          user_id: string;
          username: string | null;
          online: boolean;
          last_seen: string;
        };
        Insert: {
          user_id: string;
          username?: string | null;
          online: boolean;
          last_seen: string;
        };
        Update: {
          user_id?: string;
          username?: string | null;
          online?: boolean;
          last_seen?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          members: string[] | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          members?: string[] | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          members?: string[] | null;
        };
      };
      messages: {
        Row: {
          id: string;
          content: string;
          channel_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          channel_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          channel_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}
