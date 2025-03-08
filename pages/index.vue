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
        @select-dm="handleDMSelect"
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
            ref="messagesListRef"
            :current-channel="currentChannel"
            :messages="messages"
            :current-user-id="currentUserId"
            :loading="loadingMessages"
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

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

const { currentUserId, isLoggedIn } = useUser();
const {
  onlineUsers,
  allUsers,
  loadAllUsers,
  isUserOnline,
  setupPresence,
  cleanupPresence,
  cleanupCache: cleanupPresenceCache
} = usePresence();

const {
  messages,
  channels,
  currentChannel,
  cleanupRealtime,
  loadChannels,
  loadMessages,
  sendMessage,
  setupRealtime,
  scrollToBottom,
  clearCache: clearChatCache
} = useChat();

const { dmChannels, loadDMChannels } = useDirectMessages();

const newMessage = ref('');
const loadingMessages = ref(false);
const messagesListRef = ref<{
  scrollToBottom: (behavior?: string) => void;
} | null>(null);

const currentDMUser = computed<OnlineUser | null>(() => {
  if (
    currentChannel.value?.type !== 'dm' ||
    !currentChannel.value.participants
  ) {
    return null;
  }

  const otherUserId = currentChannel.value.participants.find(
    (id) => id !== currentUserId.value
  );
  return allUsers.value.find((u) => u.user_id === otherUserId) || null;
});

const initChat = async (): Promise<void> => {
  await loadAllUsers();
  try {
    await Promise.all([loadChannels(), loadDMChannels(), setupPresence()]);
    if (channels.value.length > 0) {
      if (import.meta.client) {
        const savedChannel = JSON.parse(
          localStorage.getItem('currentChannel') || 'null'
        );

        const targetChannel = savedChannel?.id
          ? channels.value.find((c) => c.id === savedChannel.id)
          : channels.value[0];

        if (targetChannel) await selectChannel(targetChannel.id);
      } else {
        if (channels.value[0]) await selectChannel(channels.value[0].id);
      }
    }
    setupRealtime();
  } catch (error) {
    console.error('Failed to initialize chat:', error);
  }
};

const selectChannel = async (channelId: string): Promise<void> => {
  const allChannels = [...channels.value, ...dmChannels.value];
  const channel = allChannels.find((c) => c.id === channelId);

  if (!channel) return;
  cleanupRealtime();
  currentChannel.value = channel;
  loadingMessages.value = true;

  try {
    messages.value = [];
    await loadMessages();
    await nextTick();
    setupRealtime();
    await nextTick();
    scrollToBottom();
  } finally {
    loadingMessages.value = false;
  }
};

const handleSendMessage = async (): Promise<void> => {
  if (!newMessage.value.trim() || !currentChannel.value) return;
  try {
    await sendMessage(newMessage.value);
    newMessage.value = '';
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

const handleDMSelect = async (channelId: string): Promise<void> => {
  try {
    messages.value = [];
    loadingMessages.value = true;

    await loadDMChannels();

    const channel = dmChannels.value.find((c) => c.id === channelId);

    if (channel) {
      currentChannel.value = channel;
      await loadMessages();
      setupRealtime();
      await nextTick();
      await nextTick();
      scrollToBottom();
      setTimeout(() => scrollToBottom(), 100);
    } else {
      console.error('DM channel not found:', channelId);
    }
  } catch (error) {
    console.error('Error handling DM selection:', error);
  } finally {
    loadingMessages.value = false;
  }
};

const channelMembersOnline = computed((): number => {
  if (currentChannel.value?.type === 'dm') {
    return currentDMUser.value?.online ? 1 : 0;
  }
  return (
    currentChannel.value?.members?.filter((member) =>
      onlineUsers.value.some((u) => u.user_id === member)
    ).length || 0
  );
});

onMounted(initChat);
onBeforeUnmount(() => {
  cleanupPresence();
  cleanupRealtime();
  clearChatCache();
  cleanupPresenceCache();
});
</script>
