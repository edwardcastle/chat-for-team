<template>
  <div>
    <div v-if="isLoggedIn" class="h-screen flex bg-gray-100 overflow-hidden">
      <ChatSidebar
        :channels="channels"
        :dm-channels="dmChannels"
        :users="allUsers"
        :current-channel="currentChannel"
        :is-user-online="isUserOnline"
        @select-channel="selectChannel"
        @select-dm="selectChannel"
      />

      <div class="flex-1 flex flex-col">
        <ChatHeader
          v-if="currentChannel"
          :channel="currentChannel"
          :online-count="channelMembersOnline"
          :other-user="currentDMUser"
        />

        <ClientOnly>
          <MessagesList
            :messages="messages"
            :current-user-id="currentUserId"
            :loading="loadingMessages"
            @scroll-to-bottom="scrollToBottom"
          />
        </ClientOnly>

        <MessageInput
          v-model="newMessage"
          :disabled="!currentChannel"
          @send-message="handleSendMessage"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
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

const {
  dmChannels,
  loadDMChannels
} = useDirectMessages();

const newMessage = ref('');
const loadingMessages = ref(false);

const currentDMUser = computed(() => {
  if (!currentChannel.value?.type === 'dm' || !currentChannel.value.participants) {
    return null;
  }

  const otherUserId = currentChannel.value.participants.find(
    id => id !== currentUserId.value
  );
    return allUsers.value.find(u => u.user_id === otherUserId);
});

const initChat = async () => {
  try {
    await Promise.all([
      loadChannels(),
      loadDMChannels(),
      loadAllUsers(),
      setupPresence()
    ]);
    if (channels.value.length > 0) {
      await selectChannel(channels.value[0].id);
    }
  } catch (error) {
    console.error('Failed to initialize chat:', error);
  }
};

const selectChannel = async (channelId) => {
  const allChannels = [...channels.value, ...dmChannels.value];
  const channel = allChannels.find(c => c.id === channelId);

  if (channel) {
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
  }
};

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

const channelMembersOnline = computed(() => {
  if (currentChannel.value?.type === 'dm') {
    return currentDMUser.value?.online ? 1 : 0;
  }
  return currentChannel.value?.members?.filter(member =>
    onlineUsers.value.some(u => u.user_id === member)
  ).length || 0;
});

onMounted(initChat);
onBeforeUnmount(cleanupPresence);
</script>