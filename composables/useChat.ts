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
  syncPendingMessages: () => Promise<void>;
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

  // Track processed message IDs to prevent duplicates
  const processedMessageIds = new Set<string>();

  // Local storage helpers
  const saveMessagesToLocalStorage = (
    channelId: string,
    msgs: MessageWithProfile[]
  ): void => {
    if (import.meta.client) {
      try {
        localStorage.setItem(`messages_${channelId}`, JSON.stringify(msgs));
      } catch (error) {
        console.error('Failed to save messages to localStorage:', error);
      }
    }
  };

  const clearCache = (): void => {
    messageCache.clear();
    processedMessageIds.clear();

    // Only clear localStorage on client
    if (import.meta.client) {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('messages_')) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  watch(
    currentChannel,
    (newVal) => {
      if (import.meta.client && newVal) {
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

    // Reset message IDs to prevent duplicates when switching channels
    processedMessageIds.clear();

    // Check cache first
    const cachedMessages = messageCache.get(currentChannel.value.id);
    if (cachedMessages) {
      messages.value = cachedMessages;
      return;
    }

    // Load regular messages
    const { data: serverMessages, error } = await supabase
      .from('messages')
      .select('*, profiles(username)')
      .eq('channel_id', currentChannel.value.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    // Load pending messages
    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_messages')
      .select('*, profiles(username)')
      .eq('channel_id', currentChannel.value.id)
      .eq('user_id', user.value?.id || '');

    if (pendingError) {
      console.error('Error loading pending messages:', pendingError);
    }

    // Merge messages
    const allMessages = [
      ...(serverMessages || []),
      ...(pendingData?.map((msg) => ({
        ...msg,
        status: 'sending',
        id: `pending-${msg.id}`
      })) || [])
    ];

    // Add all message IDs to the processed set
    allMessages.forEach((msg) => processedMessageIds.add(msg.id));

    // Update state
    messages.value = allMessages;
    messageCache.set(currentChannel.value.id, allMessages);
    saveMessagesToLocalStorage(currentChannel.value.id, allMessages);
  };

  if (import.meta.client) {
    window.addEventListener('online', async () => {
      await syncPendingMessages();
      await loadMessages();
    });
  }

  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || !currentChannel.value?.id || !user.value?.id) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Add optimistic message
    const optimisticMessage: MessageWithProfile = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      channel_id: currentChannel.value.id,
      user_id: user.value.id,
      profiles: { username: user.value.user_metadata?.username || 'You' },
      status: 'sending'
    };

    // Add to processed IDs to prevent duplication
    processedMessageIds.add(tempId);

    // Update state
    messages.value = [...messages.value, optimisticMessage];

    // Update cache
    if (currentChannel.value) {
      messageCache.set(currentChannel.value.id, messages.value);
      saveMessagesToLocalStorage(currentChannel.value.id, messages.value);
    }

    try {
      // Try direct insert
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: currentChannel.value.id,
          user_id: user.value.id
        })
        .select('id, created_at')
        .single();

      if (error) throw error;

      // Add the real ID to processed IDs to prevent duplication from realtime events
      processedMessageIds.add(data.id);

      // Remove the temporary ID
      processedMessageIds.delete(tempId);

      // Update message status
      messages.value = messages.value.map((msg) =>
        msg.id === tempId
          ? { ...msg, id: data.id, status: 'sent', created_at: data.created_at }
          : msg
      );

      // Update cache
      if (currentChannel.value) {
        messageCache.set(currentChannel.value.id, messages.value);
        saveMessagesToLocalStorage(currentChannel.value.id, messages.value);
      }
    } catch (error) {
      console.log(error);
      // Store in pending_messages if offline
      if (!navigator.onLine) {
        await storePendingMessage(content, tempId);
      }
      // Update message status
      messages.value = messages.value.map((msg) =>
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      );

      // Update cache
      if (currentChannel.value) {
        messageCache.set(currentChannel.value.id, messages.value);
        saveMessagesToLocalStorage(currentChannel.value.id, messages.value);
      }
    }
  };

  const storePendingMessage = async (
    content: string,
    tempId: string
  ): Promise<void> => {
    if (!currentChannel.value?.id || !user.value?.id) return;

    const { error } = await supabase.from('pending_messages').insert({
      id: tempId,
      content,
      channel_id: currentChannel.value.id,
      user_id: user.value.id,
      retries: 0
    });

    if (error) console.error('Failed to store pending message:', error);
  };

  const syncPendingMessages = async (): Promise<void> => {
    if (!user.value?.id) return;

    const { data: pending, error } = await supabase
      .from('pending_messages')
      .select('*')
      .eq('user_id', user.value.id)
      .lte('retries', 3);

    if (error) {
      console.error('Failed to fetch pending messages:', error);
      return;
    }

    if (!pending || pending.length === 0) return;

    for (const msg of pending) {
      try {
        const { error } = await supabase.from('messages').insert({
          content: msg.content,
          channel_id: msg.channel_id,
          user_id: msg.user_id
        });

        if (!error) {
          await supabase.from('pending_messages').delete().eq('id', msg.id);
        } else {
          throw error;
        }
      } catch (error) {
        console.error('Failed to sync pending message:', error);

        await supabase
          .from('pending_messages')
          .update({
            retries: msg.retries + 1,
            last_attempt: new Date().toISOString()
          })
          .eq('id', msg.id);
      }
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
        async (payload) => {
          const newMessage = payload.new as MessageWithProfile;

          // Skip if we've already processed this message (either optimistic or from previous load)
          if (
            processedMessageIds.has(newMessage.id) ||
            messages.value.some((m) => m.id === newMessage.id)
          ) {
            return;
          }

          // Add to processed set
          processedMessageIds.add(newMessage.id);

          // Load the user information for the message if not present
          if (!newMessage.profiles) {
            const { data } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', newMessage.user_id)
              .single();

            if (data) {
              newMessage.profiles = { username: data.username };
            }
          }

          // Add the new message to the list
          const updatedMessages = [...messages.value, newMessage];
          messages.value = updatedMessages;

          // Update cache
          if (currentChannel.value) {
            messageCache.set(currentChannel.value.id, updatedMessages);
            saveMessagesToLocalStorage(
              currentChannel.value.id,
              updatedMessages
            );
          }

          scrollToBottom();
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
    sendMessage,
    loadMessages,
    loadChannels,
    syncPendingMessages,
    setupRealtime,
    cleanupRealtime,
    scrollToBottom,
    clearCache
  };
};
