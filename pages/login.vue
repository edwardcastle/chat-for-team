<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <ClientOnly>
        <div v-if="isMounted">
          <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
            <div class="rounded-md shadow-sm -space-y-px">
              <div>
                <label for="email-address" class="sr-only">Email address</label>
                <input
                    id="email-address"
                    name="email"
                    type="email"
                    required
                    v-model="email"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                />
              </div>
              <div>
                <label for="password" class="sr-only">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    v-model="password"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                  type="submit"
                  class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in
              </button>
            </div>

            <div class="text-center">
              <button
                  type="button"
                  @click="handleSignUp"
                  class="text-sm text-blue-600 hover:text-blue-500"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        </div>
        <div v-else class="loading-placeholder"></div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const router = useRouter()
const { $auth } = useNuxtApp()
const isMounted = ref(false)

definePageMeta({
  layout: false
})

onMounted(() => {
  isMounted.value = true
})

const email = ref('')
const password = ref('')

async function handleLogin() {
  try {
    await $auth.login({
      email: email.value,
      password: password.value
    })
  } catch (error) {
    alert(error.message)
  }
}

function handleSignUp() {
  router.push('/register')
}
</script>

<style>
.loading-placeholder {
  @apply min-h-screen flex items-center justify-center;
}
</style>