<template>
  <div>
    <NuxtLoadingIndicator :height="3" color="#3b82f6" />
    <NuxtPage />
  </div>
</template>

<script setup>
import { usePresence } from '~/composables/usePresence.ts';

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();
const { cleanupPresence } = usePresence();

if (import.meta.client) {
  watchEffect(() => {
    const route = useRoute();
    if (!user.value && !['/login', '/register'].includes(route.path)) {
      router.push('/login');
    }
  });
}

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
