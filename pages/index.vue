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
import type { OnlineUser, Channel } from '~/types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

const newMessage = ref<string>('');
const loadingMessages = ref<boolean>(false);
const messagesListRef = ref<{
  scrollToBottom: (behavior?: ScrollBehavior) => void;
} | null>(null);

// Track current active subscription
const activeSubscription = ref<RealtimeChannel | null>(null);

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
          ? [...channels.value, ...dmChannels.value].find(
            (c) => c.id === savedChannel.id
          )
          : channels.value[0];

        if (targetChannel) await selectChannel(targetChannel.id);
      } else {
        if (channels.value[0]) await selectChannel(channels.value[0].id);
      }
    }
  } catch (error) {
    console.error('Failed to initialize chat:', error);
  }
};

const selectChannel = async (channelId: string): Promise<void> => {
  const allChannels = [...channels.value, ...dmChannels.value];
  const channel = allChannels.find((c) => c.id === channelId);

  if (!channel) return;

  // Cleanup existing subscription
  if (activeSubscription.value) {
    cleanupRealtime();
    activeSubscription.value = null;
  }

  currentChannel.value = channel;
  loadingMessages.value = true;

  try {
    // Clear messages before loading new ones to prevent flickering
    messages.value = [];
    await loadMessages();
    await nextTick();

    // Setup new subscription and store reference
    activeSubscription.value = setupRealtime();

    await nextTick();
    // Scroll after messages are loaded and rendered
    if (messagesListRef.value) {
      messagesListRef.value.scrollToBottom('smooth');
    }
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
    if (messagesListRef.value) {
      messagesListRef.value.scrollToBottom('smooth');
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

const handleDMSelect = async (channelId: string): Promise<void> => {
  try {
    // Cleanup existing subscription
    if (activeSubscription.value) {
      cleanupRealtime();
      activeSubscription.value = null;
    }

    messages.value = [];
    loadingMessages.value = true;

    await loadDMChannels();

    const channel = dmChannels.value.find((c) => c.id === channelId);

    if (channel) {
      currentChannel.value = channel;
      await loadMessages();

      // Setup new subscription and store reference
      activeSubscription.value = setupRealtime();

      await nextTick();
      if (messagesListRef.value) {
        messagesListRef.value.scrollToBottom('smooth');
      }
    } else {
      console.error('DM channel not found:', channelId);
    }
  } catch (error) {
    console.error('Error handling DM selection:', error);
  } finally {
    loadingMessages.value = false;
  }
};

const handleOnline = async () => {
  if (currentChannel.value) {
    try {
      loadingMessages.value = true;
      await loadMessages();
      if (messagesListRef.value) {
        messagesListRef.value.scrollToBottom('smooth');
      }
    } catch (error) {
      console.error('Failed to reload messages:', error);
    } finally {
      loadingMessages.value = false;
    }
  }
};

const channelMembersOnline = computed((): number => {
  if (!currentChannel.value) return 0;

  if (currentChannel.value.type === 'dm') {
    return currentDMUser.value?.online ? 1 : 0;
  }

  return (
    currentChannel.value.members?.filter((member) =>
      onlineUsers.value.some((u) => u.user_id === member)
    ).length || 0
  );
});

if (import.meta.client) {
  window.addEventListener('online', () => {
    const { syncPendingMessages } = useChat();
    syncPendingMessages();
  });
}

onMounted(() => {
  initChat();
  window.addEventListener('online', handleOnline);
});

onBeforeUnmount(() => {
  cleanupPresence();
  cleanupRealtime();
  clearChatCache();
  cleanupPresenceCache();
  window.removeEventListener('online', handleOnline);
});
</script>