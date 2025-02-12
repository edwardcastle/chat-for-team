import { useSupabaseClient } from '#imports';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload
} from '@supabase/supabase-js';
import type { Database } from '~/types/supabase';

type Tables = Database['public']['Tables'];
type MessageRow = Tables['messages']['Row'];
type Channel = Tables['channels']['Row'];

interface MessageWithProfile extends Omit<MessageRow, 'profiles'> {
  profiles: {
    username: string;
  } | null;
}

type MessageWithJoinedProfile = MessageRow & {
  profiles: {
    username: string;
  } | null;
};

export const useChat = (): {
  messages: Ref<MessageWithProfile[]>;
  channels: Ref<Channel[]>;
  currentChannel: Ref<Channel | null>;
  messagesContainer: Ref<HTMLElement | null>;
  loadChannels: () => Promise<void>;
  loadMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setupRealtime: () => RealtimeChannel;
  scrollToBottom: () => void;
} => {
  const supabase = useSupabaseClient<Database>();
  const { user } = useUser();

  // Reactive state
  const messages = ref<MessageWithProfile[]>([]);
  const channels = ref<Channel[]>([]);
  const currentChannel = ref<Channel | null>(null);
  const messagesContainer = ref<HTMLElement | null>(null);

  // Channel operations
  const loadChannels = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        channels.value = data;
      }
    } catch (error) {
      console.error('Channel load error:', error);
      throw new Error('Failed to load channels');
    }
  };

  // Message operations
  const loadMessages = async (): Promise<void> => {
    if (!currentChannel.value?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles!messages_user_id_fkey(username)')
        .eq('channel_id', currentChannel.value.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        messages.value = (data as MessageWithJoinedProfile[]).map((msg) => ({
          id: msg.id,
          content: msg.content,
          channel_id: msg.channel_id,
          user_id: msg.user_id,
          created_at: msg.created_at,
          profiles: msg.profiles || { username: 'Unknown User' }
        }));
      }
      scrollToBottom();
    } catch (error) {
      console.error('Message load error:', error);
      throw new Error('Failed to load messages');
    }
  };

  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || !currentChannel.value?.id || !user.value?.id) return;

    try {
      const { error } = await supabase.from('messages').insert({
        content,
        channel_id: currentChannel.value.id,
        user_id: user.value.id
      });

      if (error) throw error;
    } catch (error) {
      console.error('Message send error:', error);
      throw new Error('Failed to send message');
    }
  };

  // Realtime functionality
  const setupRealtime = (): RealtimeChannel => {
    const channel = supabase.channel('realtime-messages').on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${currentChannel.value?.id}`
      },
      async (payload: RealtimePostgresChangesPayload<MessageRow>) => {
        if (payload.new && 'user_id' in payload.new) {
          // Fetch the profile data for the new message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', payload.new.user_id)
            .single();

          const messageWithProfile: MessageWithProfile = {
            id: payload.new.id,
            content: payload.new.content,
            channel_id: payload.new.channel_id,
            user_id: payload.new.user_id,
            created_at: payload.new.created_at,
            profiles: profileData
              ? { username: profileData.username }
              : { username: 'Unknown User' }
          };
          messages.value = [...messages.value, messageWithProfile];
          scrollToBottom();
        }
      }
    );

    channel.subscribe();
    return channel;
  };

  // UI utilities
  const scrollToBottom = (): void => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop =
          messagesContainer.value.scrollHeight;
      }
    });
  };

  return {
    messages,
    channels,
    currentChannel,
    messagesContainer,
    loadChannels,
    loadMessages,
    sendMessage,
    setupRealtime,
    scrollToBottom
  };
};
