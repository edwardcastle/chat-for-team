import { ref } from 'vue';
import type { Database } from '~/types/supabase';
import type { Channel } from '~/types/database.types';

export const useDirectMessages = (): {
  dmChannels: Ref<Channel[]>,
  currentDMChannel: Ref<Channel | null>,
  loadDMChannels: () => Promise<void>,
  createOrGetDMChannel: (otherUserId: string) => Promise<Channel | null>
} => {
  const supabase = useSupabaseClient<Database>();
  const { user } = useUser();

  const dmChannels = ref<Channel[]>([]);
  const currentDMChannel = ref<Channel | null>(null);

  const loadDMChannels = async (): Promise<void> => {
    if (!user.value?.id) return;

    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('type', 'dm')
      .contains('participants', [user.value.id]);

    if (!error && data) {
      dmChannels.value = data as Channel[];
    }
  };

  const createOrGetDMChannel = async (otherUserId: string): Promise<Channel | null> => {
    if (!user.value?.id) return null;

    try {
      const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
        user1_id: user.value.id,
        user2_id: otherUserId
      });

      if (error) throw error;
      return (data?.[0] as Channel) || null;
    } catch (error) {
      console.error('DM channel error:', error);
      return null;
    }
  };

  return {
    dmChannels,
    currentDMChannel,
    loadDMChannels,
    createOrGetDMChannel
  };
};