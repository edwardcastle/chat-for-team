import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useSupabaseClient } from '#imports';
import type { Database } from '~/types/supabase';

interface OnlineUser {
  user_id: string;
  username?: string;
  online: boolean;
  last_seen?: string;
}

interface PresenceState {
  [key: string]: OnlineUser[];
}

export const usePresence = () => {
  const supabase = useSupabaseClient<Database>();
  const { user, loadUser } = useUser();

  const onlineUsers = ref<OnlineUser[]>([]);
  const allUsers = ref<OnlineUser[]>([]);
  let presenceChannel: RealtimeChannel | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let _onlineUsersChannel: RealtimeChannel | null = null;

  const updatePresence = async (online: boolean): Promise<void> => {
    if (!user.value) return;

    try {
      await supabase.from('online_users').upsert({
        user_id: user.value.id,
        username: user.value.user_metadata?.username,
        online,
        last_seen: new Date().toISOString()
      });
    } catch (error) {
      console.error('Presence update failed:', error);
      throw new Error('Failed to update presence status');
    }
  };

  const setupPresence = async (): Promise<void> => {
    if (import.meta.server) return;
    await loadUser();
    if (!user.value) return;

    try {
      // Initialize presence state
      await updatePresence(false);

      // Setup realtime presence channel
      presenceChannel = supabase.channel('global-presence');

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel?.presenceState() as PresenceState;
          if (state) {
            onlineUsers.value = Object.values(state)
              .flat()
              .filter((user) => user.online);
            allUsers.value = allUsers.value.map(user => ({
              ...user,
              online: onlineUsers.value.some(u => u.user_id === user.user_id)
            }));
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED' && presenceChannel && user.value) {
            await presenceChannel.track({
              user_id: user.value.id,
              username: user.value.user_metadata?.username,
              online: true
            });
            await updatePresence(true);
          }
        });

      // Setup presence heartbeat
      heartbeatInterval = setInterval(async () => {
        try {
          await updatePresence(true);
        } catch (error) {
          console.error('Presence heartbeat failed:', error);
        }
      }, 15000);
    } catch (error) {
      console.error('Presence setup failed:', error);
      throw new Error('Failed to initialize presence tracking');
    }

    _onlineUsersChannel = supabase.channel('online-users-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_users'
        },
        async (payload: RealtimePostgresChangesPayload<OnlineUser>) => {
          // Update local users state
          allUsers.value = allUsers.value.map(user => {
            if (user.user_id === payload.new.user_id) {
              return {
                ...user,
                online: payload.new.online,
                last_seen: payload.new.last_seen
              };
            }
            return user;
          });
        }
      )
      .subscribe();
  };

  const cleanupPresence = async (): Promise<void> => {
    try {
      if (presenceChannel) {
        await presenceChannel.unsubscribe();
        presenceChannel = null;
      }

      // Add cleanup for the online users channel
      if (_onlineUsersChannel) {
        await _onlineUsersChannel.unsubscribe();
        _onlineUsersChannel = null;
      }

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (user.value) {
        await updatePresence(false);
      }
    } catch (error) {
      console.error('Presence cleanup failed:', error);
    }
  };

  const loadAllUsers = async (): Promise<void> => {
    if (import.meta.server) return;
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username');

      const { data: online } = await supabase
        .from('online_users')
        .select('user_id, online, last_seen');

      if (profiles) {
        allUsers.value = profiles.map((profile) => {
          const onlineUser = online?.find((u) => u.user_id === profile.user_id);
          return {
            user_id: profile.user_id,
            username: profile.username,
            online: onlineUser?.online || false,
            last_seen: onlineUser?.last_seen || null
          };
        });
      }
    } catch (error) {
      console.error('User loading failed:', error);
      throw new Error('Failed to load user list');
    }
  };

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.value.some((u) => u.user_id === userId && u.online);
  };

  return {
    onlineUsers: readonly(onlineUsers),
    allUsers: readonly(allUsers),
    setupPresence,
    cleanupPresence,
    loadAllUsers,
    isUserOnline
  };
};
