<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
const user = useSupabaseUser()
const router = useRouter()

watchEffect(() => {
  const route = useRoute()
  if (!user.value && !['/login', '/register'].includes(route.path)) {
    router.push('/login')
  }
})
</script>