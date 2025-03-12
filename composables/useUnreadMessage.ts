import { useSupabaseClient } from '#imports';
import { ref, computed } from 'vue';
import type { Database } from '~/types/supabase';
import type { Channel } from '~/types/database.types';
import { useUser } from './useUser';
import { useChat } from './useChat';

export const useUnreadMessages = () => {
  const supabase = useSupabaseClient<Database>();
  const { user } = useUser();
  const { currentChannel } = useChat();

  // Store unread counts by channel ID
  const unreadCounts = ref<Record<string, number>>({});
  const lastReadTimestamps = ref<Record<string, string>>({});
  const dmChannels = ref<Channel[]>([]);

  // Track active subscriptions for cleanup
  const activeSubscriptions = new Set<any>();

  // Load initial unread counts for all channels
  const loadUnreadCounts = async (): Promise<void> => {
    if (!user.value?.id) return;

    try {
      // Get the last read timestamps for each channel
      const { data: lastRead, error: lastReadError } = await supabase
        .from('channel_reads')
        .select('channel_id, last_read')
        .eq('user_id', user.value.id);

      if (lastReadError) throw lastReadError;

      // Store last read timestamps
      const newTimestamps: Record<string, string> = {};
      if (lastRead) {
        lastRead.forEach((item) => {
          newTimestamps[item.channel_id] = item.last_read;
        });
      }
      lastReadTimestamps.value = newTimestamps;

      // Get unread counts for each channel
      const counts: Record<string, number> = {};

      // For each channel with a last_read timestamp, count newer messages
      for (const [channelId, timestamp] of Object.entries(newTimestamps)) {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channelId)
          .gt('created_at', timestamp)
          .neq('user_id', user.value.id); // Don't count user's own messages

        if (error) throw error;
        counts[channelId] = count || 0;
      }

      unreadCounts.value = counts;
    } catch (error) {
      console.error('Failed to load unread counts:', error);
    }
  };

  // Set up subscriptions to track new messages
  const setupUnreadTracking = (): void => {
    if (!user.value?.id) return;

    try {
      // Clean up existing subscriptions
      cleanupUnreadTracking();

      // Subscribe to new messages
      const channel = supabase
        .channel('unread-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          async (payload) => {
            const message = payload.new as any;

            // Ignore user's own messages
            if (message.user_id === user.value?.id) return;

            // Check if this is a DM channel
            const isDM = dmChannels.value.some(
              c => c.id === message.channel_id && c.type === 'dm'
            );

            // Handle DM-specific logic
            if (isDM) {
              const dmChannel = dmChannels.value.find(c => c.id === message.channel_id);
              if (dmChannel) {
                const otherUserId = dmChannel.participants.find(id => id !== user.value?.id);
                if (otherUserId) {
                  unreadCounts.value[message.channel_id] =
                    (unreadCounts.value[message.channel_id] || 0) + 1;
                }
              }
            }

            // General channel logic
            if (lastReadTimestamps.value[message.channel_id] !== undefined) {
              if (currentChannel.value?.id !== message.channel_id) {
                unreadCounts.value[message.channel_id] =
                  (unreadCounts.value[message.channel_id] || 0) + 1;
              }
            } else {
              unreadCounts.value[message.channel_id] =
                (unreadCounts.value[message.channel_id] || 0) + 1;
            }
          }
        )
        .subscribe();

      activeSubscriptions.add(channel);
    } catch (error) {
      console.error('Failed to set up unread tracking:', error);
    }
  };

  // Mark a channel as read
  const markChannelAsRead = async (channelId: string): Promise<void> => {
    if (!user.value?.id || !channelId) return;

    try {
      const now = new Date().toISOString();

      // Update the last read timestamp in the database
      await supabase.from('channel_reads').upsert(
        {
          user_id: user.value.id,
          channel_id: channelId,
          last_read: now
        },
        {
          onConflict: 'user_id,channel_id',
          returning: 'minimal'
        }
      );

      // Update local state
      lastReadTimestamps.value[channelId] = now;
      unreadCounts.value[channelId] = 0;
    } catch (error) {
      console.error('Failed to mark channel as read:', error);
    }
  };

  // Get unread count for a specific channel
  const getUnreadCount = (channelId: string): number => {
    if (!channelId) {
      console.warn('Attempted to get unread count for undefined channelId');
      return 0;
    }
    return unreadCounts.value[channelId] || 0;
  };

  // Get unread counts mapped to user IDs for DMs
  const getUserUnreadCounts = computed(() => {
    const counts: Record<string, number> = {};

    dmChannels.value.forEach((channel) => {
      if (channel.type === 'dm') {
        const otherUserId = channel.participants.find(id => id !== user.value?.id);
        if (otherUserId) {
          counts[otherUserId] = unreadCounts.value[channel.id] || 0;
        }
      }
    });

    return counts;
  });

  // Update DM channels list
  const updateDMChannels = (newDmChannels: Channel[]): void => {
    dmChannels.value = newDmChannels;
  };

  // Cleanup function
  const cleanupUnreadTracking = (): void => {
    activeSubscriptions.forEach((subscription) => {
      supabase.removeChannel(subscription);
    });
    activeSubscriptions.clear();
  };

  return {
    unreadCounts: readonly(unreadCounts),
    lastReadTimestamps: readonly(lastReadTimestamps),
    loadUnreadCounts,
    setupUnreadTracking,
    cleanupUnreadTracking,
    markChannelAsRead,
    getUnreadCount,
    getUserUnreadCounts,
    updateDMChannels
  };
};