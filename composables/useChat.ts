import { useSupabaseClient } from '#imports';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '~/types/supabase';
import type { MessageWithProfile, Channel } from '~/types/database.types';

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
  clearCache: () => void;
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

  // Local storage helpers
  const saveMessagesToLocalStorage = (channelId: string, msgs: MessageWithProfile[]): void => {
    if (import.meta.client) {
      try {
        localStorage.setItem(`messages_${channelId}`, JSON.stringify(msgs));
      } catch (error) {
        console.error('Failed to save messages to localStorage:', error);
      }
    }
  };

  const getMessagesFromLocalStorage = (channelId: string): MessageWithProfile[] => {
    if (import.meta.client) {
      try {
        const storedMessages = localStorage.getItem(`messages_${channelId}`);
        return storedMessages ? JSON.parse(storedMessages) : [];
      } catch (error) {
        console.error('Failed to get messages from localStorage:', error);
      }
    }
    return [];
  };

  const clearCache = (): void => {
    messageCache.clear();

    // Only clear localStorage on client
    if (import.meta.client) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('messages_')) {
          localStorage.removeItem(key);
        }
      });
    }
  };

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
        channels.value = data as Channel[];
      }
    } catch (error) {
      console.error('Channel load error:', error);
      throw new Error('Failed to load channels');
    }
  };

  const loadMessages = async (): Promise<void> => {
    if (!currentChannel.value?.id) return;

    // First check memory cache
    const cachedMessages = messageCache.get(currentChannel.value.id);

    if (cachedMessages?.length) {
      messages.value = cachedMessages;
    } else {
      // Try localStorage if not in memory
      const storedMessages = getMessagesFromLocalStorage(currentChannel.value.id);
      if (storedMessages.length > 0) {
        messages.value = storedMessages;
        messageCache.set(currentChannel.value.id, storedMessages);
      } else {
        messages.value = [];
      }
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

      if (!error && data) {
        const typedData = data as unknown as MessageWithProfile[];
        messageCache.set(currentChannel.value.id, typedData);
        saveMessagesToLocalStorage(currentChannel.value.id, typedData);
        messages.value = typedData;
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

    const updatedMessages = [...messages.value, optimisticMessage];
    messages.value = updatedMessages;

    // Update cache with optimistic message
    messageCache.set(currentChannel.value.id, updatedMessages);
    saveMessagesToLocalStorage(currentChannel.value.id, updatedMessages);

    await scrollToBottom();

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: currentChannel.value.id,
          user_id: user.value.id
        })
        .select('id')
        .single();

      if (error) throw error;

      const finalMessages = messages.value.map((msg) =>
        msg.id === tempId ? { ...msg, id: data.id } : msg
      );

      messages.value = finalMessages;
      messageCache.set(currentChannel.value.id, finalMessages);
      saveMessagesToLocalStorage(currentChannel.value.id, finalMessages);

    } catch (error) {
      console.error('Message send error:', error);
      const filteredMessages = messages.value.filter((msg) => msg.id !== tempId);
      messages.value = filteredMessages;
      messageCache.set(currentChannel.value.id, filteredMessages);
      saveMessagesToLocalStorage(currentChannel.value.id, filteredMessages);
      throw error;
    }
  };

  const setupRealtime = (): RealtimeChannel => {
    // Cleanup existing subscription first
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value);
      realtimeChannel.value = null;
    }

    if (!currentChannel.value?.id) {
      throw new Error('Cannot setup realtime without a channel');
    }

    const channel = supabase
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
            const updatedMessages = [...messages.value, newMessage];
            messages.value = updatedMessages;

            // Update caches
            messageCache.set(currentChannel.value!.id, updatedMessages);
            saveMessagesToLocalStorage(currentChannel.value!.id, updatedMessages);

            scrollToBottom();
          }
        }
      )
      .subscribe();

    realtimeChannel.value = channel;
    return channel;
  };

  const cleanupRealtime = (): void => {
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
    scrollToBottom,
    clearCache
  };
};