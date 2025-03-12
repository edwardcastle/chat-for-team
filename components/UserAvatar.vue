<template>
  <div class="relative">
    <div class="avatar">
      {{ userInitial }}
    </div>
    <div
      :class="isOnline ? 'bg-green-500' : 'bg-red-500'"
      class="online-indicator"
    />
    <!-- Unread Badge - Added check to ensure visibility -->
    <div
      v-if="unreadCount && unreadCount > 0"
      class="unread-badge"
    >
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  unreadCount: {
    type: Number,
    default: 0
  }
});

const userInitial = computed(() =>
  props.user && props.user.username ? props.user.username[0]?.toUpperCase() || '' : ''
);
</script>

<style scoped>
.avatar {
  @apply w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center;
}

.online-indicator {
  @apply absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white;
}

.unread-badge {
  @apply absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full bg-red-500
  text-white text-xs flex items-center justify-center px-1
  border-2 border-white font-medium z-[1000] shadow-md;
  transform: translate(25%, -25%);
}
</style>