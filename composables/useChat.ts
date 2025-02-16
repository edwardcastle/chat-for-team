import { useSupabaseClient } from '#imports';
import type {
  RealtimeChannel
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
  const realtimeChannel = ref<RealtimeChannel | null>(null);

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

  const loadMessages = async () => {
    if (!currentChannel.value?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
        id,
        content,
        created_at,
        channel_id,
        user_id,
        user:user_id (
          username
        )
      `)
        .eq('channel_id', currentChannel.value.id)
        .order('created_at', { ascending: true });

      if (!error) {
        messages.value = data.map(msg => ({
          ...msg,
          user: msg.user || null
        })) as MessageWithProfile[];
      }
    } catch (error) {
      console.error('Message load error:', error);
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

  const setupRealtime = () => {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value);
      realtimeChannel.value = null;
    }

    if (!currentChannel.value?.id) return;

    realtimeChannel.value = supabase.channel(`messages:${currentChannel.value.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${currentChannel.value.id}`
      }, (payload) => {
        const newMessage = payload.new as MessageWithProfile;
        if (!messages.value.some(msg => msg.id === newMessage.id)) {
          messages.value = [...messages.value, newMessage];
          scrollToBottom();
        }
      })
      .subscribe();

    return realtimeChannel.value;
  };

  const cleanupRealtime = () => {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value);
      realtimeChannel.value = null;
    }
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
    cleanupRealtime,
    scrollToBottom
  };
};
