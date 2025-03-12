import { useSupabaseClient } from '#imports';
import type { Database } from '~/types/supabase';
import type { Channel, UnreadCount } from '~/types/database.types';

export const useUnreadMessages = () => {
  const supabase = useSupabaseClient<Database>();
  const { user } = useUser();
  const { currentChannel } = useChat();

  // Store unread counts by channel ID
  const unreadCounts = ref<Record<string, number>>({});
  const lastReadTimestamps = ref<Record<string, string>>({});

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
      if (lastRead) {
        lastRead.forEach((item) => {
          lastReadTimestamps.value[item.channel_id] = item.last_read;
        });
      }

      // Get unread counts for each channel
      const counts: Record<string, number> = {};

      // For each channel with a last_read timestamp, count newer messages
      for (const [channelId, timestamp] of Object.entries(
        lastReadTimestamps.value
      )) {
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

            // If this message is for a channel the user has opened before
            if (lastReadTimestamps.value[message.channel_id] !== undefined) {
              // If this is not the current active channel, increment unread count
              if (currentChannel.value?.id !== message.channel_id) {
                unreadCounts.value[message.channel_id] =
                  (unreadCounts.value[message.channel_id] || 0) + 1;
              }
            } else {
              // This is a channel the user hasn't viewed yet
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
    console.log(`Getting unread count for channel ${channelId}: ${unreadCounts.value[channelId] || 0}`);
    return unreadCounts.value[channelId] || 0;
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
    loadUnreadCounts,
    setupUnreadTracking,
    cleanupUnreadTracking,
    markChannelAsRead,
    getUnreadCount
  };
};
