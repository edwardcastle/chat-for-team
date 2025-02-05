<template>
  <div class="flex mb-4" :class="{ 'justify-end': isCurrentUser }">
    <div
      class="max-w-[70%] rounded-lg p-3"
      :class="messageClasses"
    >
      <p>{{ message['profiles'].username }}</p>
      <p class="text-gray-800">{{ message.content }}</p>
      <div class="message-meta">
        <span class="timestamp">
          {{ formatTime(message.created_at) }}
        </span>
        <span v-if="isCurrentUser" class="status-icons">
          ✓✓
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTime } from '@/utils/dateUtils';

const props = defineProps({
  message: Object,
  isCurrentUser: Boolean
});

const messageClasses = computed(() => ({
  'bg-chat-sent ml-auto': props.isCurrentUser,
  'bg-white': !props.isCurrentUser
}));
</script>

<style scoped>
.message-meta {
  @apply flex items-center justify-end space-x-1 mt-1;
}

.timestamp {
  @apply text-xs text-gray-500 text-right;
}

.status-icons {
  @apply text-xs text-gray-500;
}

.bg-chat-sent {
  @apply bg-blue-300 rounded-[13px_13px_0_13px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)];
}
</style>