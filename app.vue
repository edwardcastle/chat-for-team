<template>
  <NuxtPage />
</template>

<script setup>
import { usePresence } from '~/composables/usePresence.ts';

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();
const { cleanupPresence } = usePresence();

watchEffect(() => {
  const route = useRoute();
  if (!user.value && !['/login', '/register'].includes(route.path)) {
    router.push('/login');
  }
});

const { data: authListener } = supabase.auth.onAuthStateChange(
  async (event) => {
    if (event === 'SIGNED_OUT') {
      await cleanupPresence();
    }
  }
);

onBeforeUnmount(async () => {
  authListener?.unsubscribe();
});
</script>
