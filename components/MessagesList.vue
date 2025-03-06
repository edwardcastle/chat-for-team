<template>
  <VirtualList
    :data-sources="enhancedMessages"
    :data-key="'id'"
    :data-component="MessageItem"
    :keeps="20"
    class="h-full overflow-y-auto"
  />
</template>

<script setup>
import { computed } from 'vue';
import VirtualList from 'vue3-virtual-scroll-list';
import MessageItem from './MessageItem.vue';

const props = defineProps({
  currentChannel: Object,
  messages: Array,
  currentUserId: String,
  loading: Boolean
});

const enhancedMessages = computed(() => {
  return props.messages.map(msg => {
    return { ...msg };
  });
});


console.log('Current User ID:', props.currentUserId);
console.log('Sample Message:', props.messages[0]?.user_id);

</script>