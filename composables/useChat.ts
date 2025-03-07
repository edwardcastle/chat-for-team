import { useSupabaseClient } from '#imports';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
  let currentChannel = ref<Channel | null>(null);
  const realtimeChannel: Ref<RealtimeChannel | null> = ref(null);
  if (import.meta.client) {
    currentChannel = ref<Channel | null>(
      JSON.parse(localStorage.getItem('currentChannel') || 'null')
    );
  }
  const messagesContainer = ref<HTMLElement | null>(null);

  watch(
    currentChannel,
    (newVal) => {
      if (import.meta.client) {
        localStorage.setItem('currentChannel', JSON.stringify(newVal));
      }
    },
    { deep: true }
  );

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
        .select(
          `
        id,
        content,
        created_at,
        channel_id,
        user_id,
        profiles(username)`
        )
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

  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || !currentChannel.value?.id || !user.value?.id) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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

    messages.value = [...messages.value, optimisticMessage];
    await scrollToBottom();

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: currentChannel.value.id,
          user_id: user.value.id
        })
        .select('*, profiles(username)') // Return joined data
        .single();

      if (error) throw error;

      // Replace optimistic message with real data
      messages.value = messages.value.map((msg) =>
        msg.id === tempId
          ? { ...data, profiles: optimisticMessage.profiles }
          : msg
      );
    } catch (error) {
      console.error('Message send error:', error);
      messages.value = messages.value.filter((msg) => msg.id !== tempId);
      throw error;
    }
  };

  const setupRealtime = () => {
    // Cleanup existing subscription first
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value);
      realtimeChannel.value = null;
    }

    if (!currentChannel.value?.id) return;

    realtimeChannel.value = supabase
      .channel(`messages:${currentChannel.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${currentChannel.value.id}`
        },
        (payload) => {
          const newMessage = payload.new as MessageWithProfile;
          if (!messages.value.some((msg) => msg.id === newMessage.id)) {
            messages.value = [...messages.value, newMessage];
            scrollToBottom();
          }
        }
      )
      .subscribe();
  };

  const cleanupRealtime = () => {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value);
      realtimeChannel.value = null;
    }
  };

  // UI utilities
  const scrollToBottom = async (): Promise<void> => {
    await nextTick();
    messagesContainer.value?.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth'
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
