<template>
  <VirtualList
    ref="virtualListRef"
    :data-sources="enhancedMessages"
    :data-key="'id'"
    :data-component="MessageItem"
    :keeps="50"
    :start="messages.length - 1"
    class="h-full overflow-y-auto"
    @scroll="handleVirtualScroll"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import VirtualList from 'vue3-virtual-scroll-list';
import MessageItem from './MessageItem.vue';
import type { MessageWithProfile } from '~/types/database.types';

const props = defineProps({
  currentChannel: Object,
  messages: {
    type: Array as () => MessageWithProfile[],
    required: true
  },
  currentUserId: String,
  loading: Boolean
});

const virtualListRef = ref(null);
const { loadingMoreMessages, loadMessages } = useChat();

const enhancedMessages = computed(() => {
  return props.messages.map((msg) => {
    return { ...msg };
  });
});

const handleVirtualScroll = async (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target;
  shouldAutoScroll.value = scrollHeight - (scrollTop + clientHeight) < 100;

  // Load more messages when near top
  if (
    scrollTop < 200 &&
    !loadingMoreMessages.value &&
    props.messages.length >= 50
  ) {
    loadingMoreMessages.value = true;
    if (props.messages?.length > 0) {
      const oldestMessage = props.messages.value[0];
      if (oldestMessage?.created_at) {
        await loadMessages(50, oldestMessage.created_at);
      }
    }
    loadingMoreMessages.value = false;
  }
};

const shouldAutoScroll = ref(true);

const scrollToBottom = async (behavior = 'auto') => {
  if (!shouldAutoScroll.value) return;

  await nextTick();
  if (virtualListRef.value) {
    virtualListRef.value.scrollToBottom({
      behavior
    });
  }
};

watch(
  () => props.messages,
  (newVal, oldVal) => {
    if (newVal.length !== oldVal.length) {
      scrollToBottom('smooth');
    }
  },
  { deep: true }
);

defineExpose({ scrollToBottom });
</script>
