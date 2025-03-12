import { useSupabaseClient } from '#imports';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '~/types/supabase';
import type { MessageWithProfile, Channel } from '~/types/database.types';

interface MessageCache {
  timestamp: number;
  messages: MessageWithProfile[];
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
  clearCache: () => void;
  syncPendingMessages: () => Promise<void>;
  setupGlobalMessageListener: () => RealtimeChannel;
  cleanupGlobalMessageListener: () => void;
} => {
  const supabase = useSupabaseClient<Database>();
  const { user } = useUser();

  // Reactive state
  const messages = ref<MessageWithProfile[]>([]);
  const messageCache = new Map<string, MessageWithProfile[]>();
  const channels = ref<Channel[]>([]);
  let currentChannel = ref<Channel | null>(null);
  const realtimeChannel: Ref<RealtimeChannel | null> = ref(null);
  const globalMessageChannel: Ref<RealtimeChannel | null> = ref(null);
  if (import.meta.client) {
    currentChannel = ref<Channel | null>(
      JSON.parse(localStorage.getItem('currentChannel') || 'null')
    );
  }
  const messagesContainer = ref<HTMLElement | null>(null);
  const loadingMoreMessages = ref(false);

  // Track processed message IDs to prevent duplicates
  const processedMessageIds = new Set<string>();

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

  const loadMessages = async (
    limit = 50,
    beforeTimestamp = null
  ): Promise<void> => {
    if (!currentChannel.value?.id) return;

    // Check cache first
    const cachedMessages = messageCache.get(currentChannel.value.id);
    if (cachedMessages && !beforeTimestamp) {
      console.warn(cachedMessages, 'cachedMessages');
      messages.value = cachedMessages?.messages;
      return;
    }

    // Build query
    let query = supabase
      .from('messages')
      .select('*, profiles(username)')
      .eq('channel_id', currentChannel.value.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add timestamp filter for pagination
    if (beforeTimestamp) {
      query = query.lt('created_at', beforeTimestamp);
    }

    const { data: serverMessages, error } = await query;

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    // Reverse to get ascending order
    const orderedMessages = serverMessages?.reverse() || [];

    // Update state
    messages.value = beforeTimestamp
      ? [...orderedMessages, ...messages.value]
      : orderedMessages;

    if (!beforeTimestamp) {
      messageCache.set(currentChannel.value.id, messages.value);
      saveMessagesToLocalStorage(currentChannel.value.id, messages.value);
    }
    cacheMessage(currentChannel.value.id, messages.value);
  };

  if (import.meta.client) {
    window.addEventListener('online', async () => {
      await syncPendingMessages();
      await loadMessages();
    });
  }

  const sendMessage = async (
    content: string,
    tempId: string
  ): Promise<void> => {
    if (!content.trim() || !currentChannel.value?.id || !user.value?.id) return;

    // Use provided tempId or generate a new one
    const messageId =
      tempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Add optimistic message
    const optimisticMessage = {
      id: messageId,
      content,
      created_at: new Date().toISOString(),
      channel_id: currentChannel.value.id,
      user_id: user.value.id,
      profiles: { username: user.value.user_metadata?.username || 'You' },
      status: 'sending'
    };

    // Update state and cache
    processedMessageIds.add(messageId);
    messages.value = [...messages.value, optimisticMessage];

    if (currentChannel.value) {
      messageCache.set(currentChannel.value.id, messages.value);
      saveMessagesToLocalStorage(currentChannel.value.id, messages.value);
    }

    try {
      // Try to send message with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: currentChannel.value.id,
          user_id: user.value.id
        })
        .abortSignal(controller.signal)
        .select('id, created_at')
        .single();

      clearTimeout(timeoutId);

      if (error) throw error;

      // Success handling
      processedMessageIds.add(data.id);
      processedMessageIds.delete(messageId);

      messages.value = messages.value.map((msg) =>
        msg.id === messageId
          ? { ...msg, id: data.id, status: 'sent', created_at: data.created_at }
          : msg
      );
    } catch (error) {
      console.error('Message send error:', error);

      // Check if we're online
      if (!navigator.onLine) {
        await storePendingMessage(content, messageId);

        messages.value = messages.value.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'pending' } : msg
        );
      } else {
        // We're online but still failed
        messages.value = messages.value.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        );
      }
    } finally {
      // Always update the cache
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

    if (error || !pending || pending.length === 0) return;

    // Prepare batch of messages
    const messagesToInsert = pending.map((msg) => ({
      content: msg.content,
      channel_id: msg.channel_id,
      user_id: msg.user_id
    }));

    // Batch insert
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert(messagesToInsert)
      .select('id, channel_id');

    if (!insertError && data) {
      // Map successful inserts to their original pending messages
      const successfulIds = new Set(data.map((m) => m.channel_id));

      // Delete all successful pending messages in one operation
      await supabase
        .from('pending_messages')
        .delete()
        .in('channel_id', [...successfulIds]);

      // Update retries for failed messages
      const failedMsgs = pending.filter(
        (msg) => !successfulIds.has(msg.channel_id)
      );
      if (failedMsgs.length > 0) {
        const updates = failedMsgs.map((msg) => ({
          id: msg.id,
          retries: msg.retries + 1,
          last_attempt: new Date().toISOString()
        }));

        await supabase.from('pending_messages').upsert(updates);
      }
    }
  };

  // New function to handle messages for any channel
  const addMessageToCache = async (
    channelId: string,
    newMessage: MessageWithProfile
  ): Promise<void> => {
    // Skip if we've already processed this message
    if (processedMessageIds.has(newMessage.id)) {
      return;
    }

    // Add to processed set
    processedMessageIds.add(newMessage.id);

    // Load user information if not present
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

    // Update cache for the specific channel
    let channelMessages = messageCache.get(channelId) || [];
    channelMessages = [...channelMessages, newMessage];
    messageCache.set(channelId, channelMessages);

    // If this is for the current channel, update the messages array too
    if (currentChannel.value?.id === channelId) {
      messages.value = [...messages.value, newMessage];
      saveMessagesToLocalStorage(channelId, messages.value);
      await scrollToBottom();
    } else {
      saveMessagesToLocalStorage(channelId, channelMessages);
    }
  };

  // Set up a global listener for all messages
  const setupGlobalMessageListener = (): RealtimeChannel => {
    if (globalMessageChannel.value) {
      supabase.removeChannel(globalMessageChannel.value);
      globalMessageChannel.value = null;
    }

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new as MessageWithProfile;
          if (!processMessage(newMessage)) return;
          await addMessageToCache(newMessage.channel_id, newMessage);
        }
      )
      .subscribe();

    globalMessageChannel.value = channel;
    return channel;
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
          if (!processMessage(newMessage)) return;
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

  const cleanupGlobalMessageListener = (): void => {
    if (globalMessageChannel.value) {
      supabase.removeChannel(globalMessageChannel.value);
      globalMessageChannel.value = null;
    }
  };

  const processMessage = (
    newMessage: MessageWithProfile,
    skipDupeCheck = false
  ): boolean => {
    if (!skipDupeCheck) {
      const isDuplicate = messages.value.some(
        (msg) =>
          msg.id === newMessage.id ||
          (msg.content === newMessage.content &&
            Math.abs(
              new Date(msg.created_at).getTime() -
                new Date(newMessage.created_at).getTime()
            ) < 1000)
      );

      if (isDuplicate) return false;
    }
    return true;
  };

  const cacheMessage = (
    channelId: string,
    messageList: MessageWithProfile[]
  ): void => {
    const cacheData = {
      timestamp: Date.now(),
      messages: messageList
    };
    messageCache.set(channelId, cacheData);
    saveMessagesToLocalStorage(channelId, cacheData);
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
    loadingMoreMessages,
    sendMessage,
    loadMessages,
    loadChannels,
    syncPendingMessages,
    setupRealtime,
    cleanupRealtime,
    scrollToBottom,
    clearCache,
    setupGlobalMessageListener,
    cleanupGlobalMessageListener
  };
};
