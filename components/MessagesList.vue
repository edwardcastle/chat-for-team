<template>
  <div
    ref="messagesContainer"
    class="flex-1 overflow-y-auto p-4 bg-chat-bg"
  >
    <div v-if="loading" class="text-center text-gray-500 py-4">
      Loading messages...
    </div>

    <template v-else>
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :is-current-user="message.user_id === currentUserId"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onUpdated } from 'vue';

defineProps({
  messages: Array,
  currentUserId: String,
  loading: Boolean
});

const messagesContainer = ref(null);

// Scroll to bottom when messages update
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Automatically scroll when component updates
onUpdated(scrollToBottom);

defineExpose({ scrollToBottom });
</script>