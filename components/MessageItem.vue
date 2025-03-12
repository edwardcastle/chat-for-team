<template>
  <div class="flex mb-4" :class="{ 'justify-end': source.user_id === currentUserId }">
    <div
      class="py-3 px-4"
      :class="[
        source.user_id === currentUserId
          ? 'bg-chat-sent ml-auto'
          : 'bg-white'
      ]"
    >
      <p class="text-sm text-gray-500 mb-1">
        {{ source.user_id === currentUserId ? 'You' : getUserName() }}
      </p>
      <p class="text-gray-800">{{ source.content }}</p>
      <div class="message-meta">
        <span class="timestamp">
          {{ formatTime(source.created_at) }}
        </span>
        <span v-if="isCurrent" class="status-icons">
          <template v-if="source.status === 'sending'">🕒</template>
          <template v-else-if="source.status === 'failed'">❌</template>
          <template v-else>✓✓</template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageWithProfile } from '~/types/database.types';

const { currentUserId } = useUser();

const props = defineProps({
  source: {
    type: Object as PropType<MessageWithProfile>,
    required: true
  }
});

const isCurrent = computed(
  () => props.source.user_id === currentUserId.value
);

const getUserName = (): string => {
  return props.source.profiles?.username || 'Unknown User';
};
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

.bg-white {
  @apply rounded-[13px_13px_13px_0px];
}

.bg-chat-sent {
  @apply bg-blue-300 rounded-[13px_13px_0_13px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)];
}
</style>