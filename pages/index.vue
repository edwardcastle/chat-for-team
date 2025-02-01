<template>
  <div class="h-screen flex">
    <!-- Channels Sidebar -->
    <div class="w-64 bg-gray-800 text-white flex flex-col">
      <div class="p-4">
        <h1 class="text-xl font-bold">Freemock</h1>
        <div class="mt-4">
          <button
              v-for="channel in channels"
              :key="channel.id"
              @click="selectChannel(channel)"
              class="w-full text-left px-2 py-1 rounded hover:bg-gray-700 mb-1"
              :class="{ 'bg-gray-700': currentChannel?.id === channel.id }"
          >
            # {{ channel.name }}
          </button>
        </div>
      </div>

      <!-- Online Users -->
      <div class="mt-auto p-4 border-t border-gray-700">
        <h3 class="font-semibold mb-2">Online Users ({{ onlineUsers.length }})</h3>
        <div v-for="user in onlineUsers" :key="user.user_id">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-500"></div>
            {{ user.username }}
            <span class="text-xs text-gray-500">(last seen {{ (user.last_seen) }})</span>
          </div>
        </div>
      </div>
      <h3 class="font-semibold mb-2" @click="handleLogout()">Logout {{ username}}</h3>
    </div>

    <!-- Main Chat -->
    <div ref="messagesContainer"
         class="flex-1 overflow-y-auto p-6 flex-1 flex flex-col"
    >
      <!-- Channel Header -->
      <div class="h-16 border-b flex items-center px-6">
        <h2 class="text-lg font-medium" v-if="currentChannel">
          #{{ currentChannel.name }}
          <span class="text-sm text-gray-500 ml-2">{{ currentChannel.description }}</span>
        </h2>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-6" ref="messagesContainer">
        <div v-for="message in messages" :key="message.id" class="mb-4">
          <div class="flex items-start">
            <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              {{ message.profiles?.username?.[0]?.toUpperCase() }}
            </div>
            <div class="ml-3">
              <div class="flex items-baseline">
                <span class="text-sm font-medium">{{ message.profiles?.username }}</span>
                <span class="ml-2 text-xs text-gray-500">
                  {{ new Date(message.created_at).toLocaleTimeString() }}
                </span>
              </div>
              <div class="text-gray-700">{{ message.content }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="h-24 border-t p-4">
        <form @submit.prevent="sendMessage" class="h-full">
          <input
              v-model="newMessage"
              type="text"
              placeholder="Type a message..."
              class="w-full h-full px-4 rounded-lg border focus:outline-none focus:border-blue-500"
              :disabled="!currentChannel"
          />
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import {usePresence} from "~/composables/usePresence.js";
import {useChat} from "~/composables/useChat.js";

const {onlineUsers, setupPresence, cleanupPresence} = usePresence()
const {messages, channels, currentChannel, loadChannels, setupRealtime, loadMessages, scrollToBottom} = useChat()
const supabase = useSupabaseClient()
const router = useRouter()
const { user, username } = useUser()

const { $auth } = useNuxtApp()

onMounted(async () => {
  await setupPresence()
  await loadChannels()
  await setupPresence()
  setupRealtime()
  scrollToBottom()
})

// Cleanup subscriptions
onUnmounted(async () => {
  await supabase.removeAllChannels()
  await cleanupPresence()
})

// Channel selection handler
const selectChannel = async (channel) => {
  // Clear existing data
  currentChannel.value = channel
  messages.value = []

  // Unsubscribe previous realtime
  supabase.removeAllChannels()

  // Load messages and setup realtime
  await loadMessages()
  setupRealtime()
  scrollToBottom()
}

// Add watcher for initial channel load
watch(() => currentChannel.value?.id, (newVal) => {
  if (newVal) {
    loadMessages()
  }
}, {immediate: true})

// Message sending
const newMessage = ref('')
const sendMessage = async () => {
  if (!newMessage.value.trim()) return

  await supabase
      .from('messages')
      .insert({
        content: newMessage.value,
        channel_id: currentChannel.value.id,
        user_id: user.value.id
      })

  newMessage.value = ''
}

onBeforeUnmount(() => {
  supabase.removeAllChannels()
})


async function handleLogout() {
  try {
    await $auth.logout()
    router.push('/login')
  } catch (error) {
    alert(error.message)
  }
}
</script>