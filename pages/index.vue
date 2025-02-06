<template>
  <div>
    <div v-if="isLoggedIn" class="h-screen flex bg-gray-100 overflow-hidden">
      <!-- Left Sidebar Component -->
      <ChatSidebar
        :channels="channels"
        :users="allUsers"
        :current-channel="currentChannel"
        :is-user-online="isUserOnline"
        @select-channel="selectChannel"
      />

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col">
        <!-- Chat Header Component -->
        <ChatHeader
          v-if="currentChannel"
          :channel="currentChannel"
          :online-count="channelMembersOnline"
        />

        <!-- Messages List Component -->
        <ClientOnly>
          <MessagesList
            :messages="messages"
            :current-user-id="currentUserId"
            :loading="loadingMessages"
            @scroll-to-bottom="scrollToBottom"
          />
        </ClientOnly>

        <!-- Message Input Component -->
        <MessageInput
          v-model="newMessage"
          :disabled="!currentChannel"
          @send-message="handleSendMessage"
        />
      </div>
    </div>

    <div v-else>
      <NuxtLoadingIndicator />
    </div>
  </div>
</template>

<script setup>
// Composables
const { currentUserId, isLoggedIn } = useUser();
const {
  onlineUsers,
  allUsers,
  loadAllUsers,
  isUserOnline,
  setupPresence,
  cleanupPresence
} = usePresence();
const {
  messages,
  channels,
  currentChannel,
  loadChannels,
  loadMessages,
  sendMessage,
  setupRealtime,
  scrollToBottom
} = useChat();

// Local state
const newMessage = ref('');
const loadingMessages = ref(false);

/**
 * Initialize chat application
 * - Load channels and users
 * - Setup presence tracking
 * - Select first channel by default
 */
const initChat = async () => {
  try {
    await Promise.all([loadChannels(), loadAllUsers(), setupPresence()]);
    if (channels.value.length > 0) {
      await selectChannel(channels.value[0]);
    }
  } catch (error) {
    console.error('Failed to initialize chat:', error);
  }
};

/**
 * Handle channel selection
 * @param {Object} channel - Selected channel object
 */
const selectChannel = async (channel) => {
  currentChannel.value = channel;
  loadingMessages.value = true;
  try {
    messages.value = [];
    await loadMessages();
    setupRealtime();
    nextTick(scrollToBottom);
  } finally {
    loadingMessages.value = false;
  }
};

/**
 * Handle sending new messages
 */
const handleSendMessage = async () => {
  if (!newMessage.value.trim() || !currentChannel.value) return;
  try {
    await sendMessage(newMessage.value);
    newMessage.value = '';
    nextTick(scrollToBottom);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

// Computed number of online members in current channel
const channelMembersOnline = computed(() => {
  return currentChannel.value?.members?.filter(member =>
    onlineUsers.value.some(u => u.user_id === member)
  ).length || 0;
});

// Lifecycle hooks
onMounted(initChat);
onBeforeUnmount(cleanupPresence);
</script>