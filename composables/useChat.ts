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

export const useChat = (): {
  messages: Ref<MessageWithProfile[]>;
  channels: Ref<Channel[]>;
  currentChannel: Ref<Channel | null>;
  messagesContainer: Ref<HTMLElement | null>;
  loadChannels: () => Promise<void>;
  loadMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setupRealtime: () => RealtimeChannel;
  cleanupRealtime: () => void;
  scrollToBottom: () => void;
} => {
  const supabase = useSupabaseClient<Database>();
  const { user } = useUser();

  // Reactive state
  const messages = ref<MessageWithProfile[]>([]);
  const messageCache = new Map<string, MessageWithProfile[]>();
  const channels = ref<Channel[]>([]);
  const currentChannel = ref<Channel | null>(null);
  const messagesContainer = ref<HTMLElement | null>(null);
  const activeSubscriptions = new Map<string, RealtimeChannel>();

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

    if (messageCache.has(currentChannel.value.id)) {
      messages.value = messageCache.get(currentChannel.value.id);
      return;
    }

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
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error) {
        messageCache.set(currentChannel.value.id, data);
        messages.value = data;
      }
    } catch (error) {
      console.error('Message load error:', error);
    }
  };

// useChat.ts - Modified sendMessage function
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || !currentChannel.value?.id || !user.value?.id) return;

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic message
    const optimisticMessage: MessageWithProfile = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      channel_id: currentChannel.value.id,
      user_id: user.value.id,
      profiles: {
        username: user.value.user_metadata?.username || 'You'
      }
    };

    // Optimistic update
    messages.value = [...messages.value, optimisticMessage];
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: currentChannel.value.id,
          user_id: user.value.id
        })
        .select('*');

      if (error) throw error;
      if (!data || !data[0]) throw new Error('Failed to send message');

      // Replace optimistic message with real data
      messages.value = messages.value.map(msg =>
        msg.id === tempId ? { ...data[0], profiles: optimisticMessage.profiles } : msg
      );
    } catch (error) {
      console.error('Message send error:', error);
      // Rollback optimistic update
      messages.value = messages.value.filter(msg => msg.id !== tempId);
      throw error;
    }
  };

  const setupRealtime = (): RealtimeChannel | undefined => {
    if (!currentChannel.value?.id) return;

    const channelId = currentChannel.value.id;

    // Cleanup existing subscription
    if (activeSubscriptions.has(channelId)) {
      const existing = activeSubscriptions.get(channelId);
      existing?.unsubscribe();
    }

    const channel = supabase.channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        const newMessage = payload.new as MessageWithProfile;
        if (!messages.value.some(msg => msg.id === newMessage.id)) {
          messages.value = [...messages.value, newMessage];
          scrollToBottom();
        }
      })
      .subscribe();

    activeSubscriptions.set(channelId, channel);
    return channel;
  };

  const cleanupRealtime = (): void => {
    activeSubscriptions.forEach(channel => {
      channel.unsubscribe();
    });
    activeSubscriptions.clear();
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
