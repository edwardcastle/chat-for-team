<template>
  <div class="flex mb-4" :class="{ 'justify-end': source.user_id === currentUserId }">
    <div class="py-3 px-4 bg-white" :class="{ 'bg-chat-sent ml-auto': source.user_id === currentUserId }">
      <p class="text-sm text-gray-500 mb-1">
        {{ source.user?.username }}
      </p>
      <p class="text-gray-800">{{ source.content }}</p>
      <div class="message-meta">
        <span class="timestamp">
          {{ formatTime(source.created_at) }}
        </span>
        <span v-if="isCurrent" class="status-icons">✓✓</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const { currentUserId } = useUser();
const props = defineProps({
  source: {
    type: Object,
    required: true
  }
});

const isCurrent = computed(
  () => props.source.user_id === currentUserId
);
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
