<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-8">
      <h2 class="text-center text-3xl font-bold text-gray-900">
        Create an Account
      </h2>
      <form class="space-y-6" @submit.prevent="handleRegister">
        <div>
          <input
            v-model="email"
            type="email"
            required
            placeholder="email"
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
          />
        </div>

        <div>
          <input
            v-model="username"
            type="text"
            required
            placeholder="Username"
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
          />
        </div>

        <div>
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            required
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
          />
        </div>

        <button
          type="submit"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Sign Up
        </button>
      </form>

      <div class="text-center">
        <NuxtLink to="/login" class="text-sm text-blue-600 hover:text-blue-500">
          Already have an account? Sign in
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const router = useRouter();
const { $auth } = useNuxtApp();

const email = ref('');
const username = ref('');
const password = ref('');

async function handleRegister() {
  try {
    await $auth.register({
      email: email.value,
      password: password.value,
      username: username.value
    });
    alert('Registration successful! Check your email.');
    router.push('/login');
  } catch (error) {
    alert(error.message);
  }
}
</script>
