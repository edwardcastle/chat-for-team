<template>
  <div class="p-4 bg-gray-50 border-b flex items-center">
    <div class="flex items-center space-x-3">
      <div class="channel-avatar">
        {{ channelInitial }}
      </div>
      <div>
        <h2 class="font-semibold">#{{ channel.name }}</h2>
        <p class="text-sm text-gray-500">
          {{ onlineCount }} online
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  channel: Object,
  onlineCount: Number
});

const channelInitial = computed(() =>
  props.channel.name?.[0]?.toUpperCase() || ''
);
</script>

<style scoped>
.channel-avatar {
  @apply w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center;
}
</style>