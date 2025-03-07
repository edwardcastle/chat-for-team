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
import { computed } from 'vue';
import VirtualList from 'vue3-virtual-scroll-list';
import MessageItem from './MessageItem.vue';

const props = defineProps({
  currentChannel: Object,
  messages: Array,
  currentUserId: String,
  loading: Boolean
});

const virtualListRef = ref(null);

const enhancedMessages = computed(() => {
  return props.messages.map((msg) => {
    return { ...msg };
  });
});

const handleVirtualScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target;
  shouldAutoScroll.value = scrollHeight - (scrollTop + clientHeight) < 100;
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
