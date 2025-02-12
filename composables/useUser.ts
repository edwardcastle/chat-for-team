import type { User } from '@supabase/supabase-js';
import type { Profile, ProfileInsert } from '~/types/database.types';
import type { Database } from '~/types/supabase';

export const useUser = (): {
  user: Readonly<Ref<User | null>>;
  loadUser: () => Promise<void>;
  setUser: (newUser: User | null) => void;
  getProfile: () => Promise<Profile | null>;
  isLoggedIn: ComputedRef<boolean>;
  currentUserId: ComputedRef<string | undefined>;
} => {
  const user = useState<User | null>('user', () => null);
  const supabase = useSupabaseClient<Database>();

  const loadUser = async (): Promise<void> => {
    try {
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser();

      if (authUser) {
        // Verify profile exists
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', authUser.id)
          .single();

        if (error || !profile) {
          // Create profile if missing
          const profileData: ProfileInsert = {
            user_id: authUser.id,
            username:
              authUser.user_metadata?.username ||
              `user_${Math.random().toString(36).substring(2, 11)}`
          };

          await supabase.from('profiles').upsert(profileData);
        }
      }

      user.value = authUser;
    } catch (error) {
      console.error('Error loading user:', error);
      throw new Error('Failed to load user data');
    }
  };

  const setUser = (newUser: User | null): void => {
    user.value = newUser;
  };

  const getProfile = async (): Promise<Profile | null> => {
    if (!user.value) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.value.id)
      .single();
    return data as Profile | null;
  };

  return {
    user: readonly(user),
    loadUser,
    setUser,
    getProfile,
    isLoggedIn: computed(() => !!user.value),
    currentUserId: computed(() => user.value?.id)
  };
};
