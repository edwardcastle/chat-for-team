import { navigateTo } from '#imports';

interface AuthCredentials {
  email: string;
  password: string;
  username?: string;
}

export default defineNuxtPlugin(async (nuxtApp) => {
  const supabase = useSupabaseClient();
  const { setUser, loadUser } = useUser();

  // Initial auth check with profile verification
  await loadUser().catch(console.error);

  // Auth state changes
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      await loadUser();

      // Handle session restoration
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', session?.user?.id)
          .single();

        if (!profile) {
          await supabase.from('profiles').upsert({
            user_id: session?.user?.id,
            username: session?.user?.user_metadata?.username
          });
        }
      }
    } catch (error) {
      console.error('Auth state change error:', error);
    }
  });

  // Cleanup
  nuxtApp.hook('app:afterInit', () => {
    subscription?.unsubscribe();
  });

  return {
    provide: {
      auth: {
        async login({ email, password }: AuthCredentials): Promise<void> {
          try {
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            if (error) throw error;

            await loadUser();
            const { getProfile } = useUser();
            await getProfile(); // Force profile check

            navigateTo('/');
          } catch (error) {
            console.error('Login failed:', error);
            throw error;
          }
        },

        async register({
          email,
          password,
          username
        }: AuthCredentials): Promise<void> {
          try {
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { username },
                emailRedirectTo: `${window.location.origin}/confirm`
              }
            });

            if (error) throw error;

            // Create profile immediately
            if (data.user?.id) {
              await supabase.from('profiles').upsert({
                user_id: data.user.id,
                username
              });
            }
            // return data;
          } catch (error) {
            console.error('Registration failed:', error);
            throw error;
          }
        },

        async logout(): Promise<void> {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setUser(null);
            navigateTo('/login');
          } catch (error) {
            console.error('Logout failed:', error);
            throw error;
          }
        }
      }
    }
  };
});
