<template>
  <div class="relative">
    <div class="avatar">
      {{ userInitial }}
    </div>
    <div
      :class="isOnline ? 'bg-green-500' : 'bg-red-500'"
      class="online-indicator"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  user: Object,
  isOnline: Boolean
});

const userInitial = computed(() =>
  props.user.username?.[0]?.toUpperCase() || ''
);
</script>

<style scoped>
.avatar {
  @apply w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center;
}

.online-indicator {
  @apply absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white;
}
</style>