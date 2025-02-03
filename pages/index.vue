<template>
  <div class="h-screen flex bg-gray-100">
    <!-- Left Sidebar -->
    <div class="w-1/3 border-r bg-white flex flex-col">
      <!-- Channels Section -->
      <div class="p-4 bg-gray-50 border-b">
        <h2 class="text-sm font-semibold text-gray-500 mb-2">Channels</h2>
        <div
            v-for="channelItem in channels"
            :key="channelItem.id"
            @click="selectChannel(channelItem)"
            class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
            :class="{ 'bg-gray-100': currentChannel?.id === channelItem.id }"
        >
          <div class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
            #
          </div>
          <span class="ml-3 text-gray-700">{{ channelItem.name }}</span>
        </div>
      </div>

      <!-- Users Section -->
      <div class="p-4 bg-gray-50 border-b flex-1">
        <h2 class="text-sm font-semibold text-gray-500 mb-2">Direct Messages</h2>
        <div
            v-for="user in allUsers"
            :key="user.user_id"
            class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
        >
          <div class="relative">
            <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              {{ user.username?.[0]?.toUpperCase() }}
            </div>
            <div
                v-if="isUserOnline(user.user_id)"
                class="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white"
            ></div>
          </div>
          <span class="ml-3 text-gray-700">{{ user.username }}</span>
        </div>
      </div>
    </div>

    <!-- Main Chat Area -->
    <div class="flex-1 flex flex-col">
      <!-- Chat Header -->
      <div class="p-4 bg-gray-50 border-b flex items-center">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            {{ currentChannel?.name?.[0]?.toUpperCase() ?? '' }}
          </div>
          <div>
            <h2 class="font-semibold">#{{ currentChannel?.name }}</h2>
            <p class="text-sm text-gray-500">
              {{ channelMembersOnline }} online
            </p>
          </div>
        </div>
      </div>

      <!-- Messages Container -->
      <ClientOnly>
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 bg-whatsapp-bg">
          <div v-if="loadingMessages" class="text-center text-gray-500 py-4">
            Loading messages...
          </div>

          <template v-else>
            <div
                v-for="message in messages"
                :key="message.id"
                class="flex mb-4"
                :class="{ 'justify-end': message.user_id === currentUserId }"
            >
              <div
                  class="max-w-[70%] rounded-lg p-3"
                  :class="{
                  'bg-whatsapp-sent ml-auto': message.user_id === currentUserId,
                  'bg-white': message.user_id !== currentUserId
                }"
              >
                <p class="text-gray-800">{{ message.content }}</p>
                <div class="flex items-center justify-end space-x-1 mt-1">
                  <span class="text-xs text-gray-500 text-right">
                    {{ formatTime(message.created_at) }}
                  </span>
                  <span v-if="message.user_id === currentUserId" class="text-xs text-gray-500">
                    ✓✓
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </ClientOnly>

      <!-- Message Input -->
      <div class="p-4 bg-gray-50 border-t">
        <div class="flex items-center space-x-2">
          <input
              v-model="newMessage"
              @keyup.enter="handleSendMessage"
              type="text"
              placeholder="Type a message"
              class="flex-1 rounded-full py-2 px-4 border focus:outline-none focus:border-green-500"
          />
          <ClientOnly>
            <button
                @click="handleSendMessage"
                class="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!currentChannel || !newMessage.trim()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                    d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
                />
              </svg>
            </button>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const {currentUserId} = useUser()
const {onlineUsers, allUsers, loadAllUsers, isUserOnline, setupPresence, cleanupPresence} = usePresence()
const {
  messages,
  channels,
  currentChannel,
  messagesContainer,
  loadChannels,
  loadMessages,
  sendMessage,
  setupRealtime,
  scrollToBottom
} = useChat()

const newMessage = ref('')
const loadingMessages = ref(false)

const initChat = async () => {
  await Promise.all([
    loadChannels(),
    loadAllUsers(),
    setupPresence()
  ])

  if (channels.value.length > 0) {
    await selectChannel(channels.value[0])
  }
}

onMounted(async () => {
  await initChat()
  nextTick(scrollToBottom)
})

const channelMembersOnline = computed(() => {
  if (!currentChannel.value) return 0
  return onlineUsers.value.filter(u =>
      currentChannel.value?.members?.includes(u.user_id)
  ).length
})

const selectChannel = async (channel) => {
  currentChannel.value = channel
  loadingMessages.value = true
  messages.value = []
  await loadMessages()
  setupRealtime()
  loadingMessages.value = false
  scrollToBottom()
}

const handleSendMessage = async () => {
  if (!newMessage.value.trim() || !currentChannel.value) return

  await sendMessage(newMessage.value)
  newMessage.value = ''
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

onBeforeUnmount(async () => {
  await cleanupPresence()
})
</script>

<style scoped>
.bg-whatsapp-bg {
  background-color: #ece5dd;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill='%23d1e9e0' fill-opacity='0.4'%3E%3Crect x='0' y='0' width='15' height='15'/%3E%3Crect x='50' y='0' width='15' height='15'/%3E%3Crect x='0' y='50' width='15' height='15'/%3E%3Crect x='50' y='50' width='15' height='15'/%3E%3C/g%3E%3C/svg%3E");
}

.bg-whatsapp-sent {
  background-color: #dcf8c6;
  border-radius: 15px 15px 0 15px;
  box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);
}
</style>