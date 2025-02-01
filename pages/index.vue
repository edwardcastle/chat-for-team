<template>
  <div v-if="isLoading" class="h-screen flex items-center justify-center">
    <div class="text-gray-600">Loading...</div>
  </div>

  <div v-else-if="error" class="h-screen flex items-center justify-center">
    <div class="text-red-600">{{ error }}</div>
  </div>

  <div v-else class="h-screen flex">
    <!-- Rest of the template remains exactly the same -->
    <!-- Sidebar -->
    <div class="w-64 bg-gray-800 text-white flex flex-col">
      <div class="p-4">
        <h1 class="text-xl font-bold">Freemock</h1>
      </div>

      <!-- Channel List -->
      <div class="flex-1 overflow-y-auto">
        <div class="px-4 mb-2">
          <h2 class="text-sm font-semibold text-gray-400 uppercase">Channels</h2>
        </div>
        <div v-if="loadingChannels" class="px-4 py-2 text-sm text-gray-400">
          Loading channels...
        </div>
        <div v-else-if="channelError" class="px-4 py-2 text-sm text-red-400">
          {{ channelError }}
        </div>
        <div v-else v-for="channel in channels" :key="channel.id" class="px-2">
          <button
              @click="currentChannel = channel"
              class="w-full text-left px-2 py-1 rounded hover:bg-gray-700"
              :class="{ 'bg-gray-700': currentChannel?.id === channel.id }"
          >
            # {{ channel.name }}
          </button>
        </div>
      </div>

      <!-- User Info -->
      <div class="p-4 border-t border-gray-700" v-if="user">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            {{ user.email?.[0].toUpperCase() }}
          </div>
          <div class="ml-2">
            <div class="text-sm font-medium">{{ user.email }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Channel Header -->
      <div class="h-16 border-b flex items-center px-6">
        <h2 class="text-lg font-medium" v-if="currentChannel">
          #{{ currentChannel.name }}
          <span class="text-sm text-gray-500 ml-2">{{ currentChannel.description }}</span>
        </h2>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-6" ref="messagesContainer">
        <div v-if="loadingMessages" class="text-center text-gray-500">
          Loading messages...
        </div>
        <div v-else-if="messageError" class="text-center text-red-500">
          {{ messageError }}
        </div>
        <div v-else v-for="message in messages" :key="message.id" class="mb-4">
          <div class="flex items-start">
            <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              {{ message.profiles?.username?.[0]?.toUpperCase() }}
            </div>
            <div class="ml-3">
              <div class="flex items-baseline">
                <span class="text-sm font-medium">{{ message.profiles?.username }}</span>
                <span
                    class="ml-2 text-xs text-gray-500">
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
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const isLoading = ref(true)
const error = ref('')

// Initial setup and auth check
onMounted(async () => {
  try {
    const {data: {session}, error: authError} = await supabase.auth.getSession()
    if (authError) throw authError

    if (!session) {
      router.push('/login')
      return
    }

    await loadChannels()
  } catch (e) {
    console.error('Setup error:', e)
    error.value = 'Failed to initialize the application. Please refresh the page.'
  } finally {
    isLoading.value = false
  }
})

const channels = ref([])
const currentChannel = ref(null)
const messages = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)
const loadingChannels = ref(false)
const loadingMessages = ref(false)
const channelError = ref('')
const messageError = ref('')

// Load channels
async function loadChannels() {
  loadingChannels.value = true
  channelError.value = ''

  try {
    const {data, error} = await supabase
        .from('channels')
        .select('*')
        .order('created_at')

    if (error) throw error

    channels.value = data
    if (data?.length > 0 && !currentChannel.value) {
      currentChannel.value = data[0]
    }
  } catch (error) {
    console.error('Error loading channels:', error)
    channelError.value = 'Failed to load channels. Please try again.'
  } finally {
    loadingChannels.value = false
  }
}

// Load messages for current channel
async function loadMessages() {
  if (!currentChannel.value) return

  loadingMessages.value = true
  messageError.value = ''

  try {
    if (!currentChannel.value?.id) return;

    const { data, error } = await supabase
        .from('messages')
        .select(`
        id,
        content,
        created_at,
        profiles:user_id (username)
      `)
        .eq('channel_id', currentChannel.value.id)
        .order('created_at', { ascending: true });

    if (error) throw error

    messages.value = data
    scrollToBottom()
  } catch (error) {
    console.error('Error loading messages:', error)
    messageError.value = 'Failed to load messages. Please try again.'
  } finally {
    loadingMessages.value = false
  }
}

// Send a new message
async function sendMessage() {
  if (!newMessage.value.trim() || !currentChannel.value || !user.value) return

  try {
    const {error} = await supabase.from('messages').insert({
      content: newMessage.value,
      channel_id: currentChannel.value.id,
      user_id: user.value.id
    })

    if (error) throw error

    newMessage.value = ''
  } catch (error) {
    console.error('Error sending message:', error)
    alert('Failed to send message. Please try again.')
  }
}

// Scroll to bottom of messages
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Watch for channel changes
watch(currentChannel, () => {
  loadMessages()
})

// Subscribe to new messages
onMounted(() => {
  supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, () => {
        loadMessages()
      })
      .subscribe()
})
</script>