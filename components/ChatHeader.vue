<template>
  <div class="p-4 bg-gray-50 border-b flex items-center">
    <div class="flex items-center space-x-3">
      <div class="channel-avatar">
        {{ channelIcon }}
      </div>
      <div>
        <h2 class="font-semibold">{{ channelName }}</h2>
        <p class="text-sm text-gray-500">
          {{ statusText }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  channel: Object,
  onlineCount: Number,
  otherUser: Object
});

const channelIcon = computed(() => {
  if (props.channel.type === 'dm') {
    return props.otherUser?.username?.[0]?.toUpperCase() || '';
  }
  return '#';
});

const channelName = computed(() => {
  if (props.channel.type === 'dm') {
    return props.otherUser?.username || 'Unknown User';
  }
  return props.channel.name;
});

const statusText = computed(() => {
  if (props.channel.type === 'dm') {
    return props.otherUser?.online ? 'Online' : 'Offline';
  }
  return `${props.onlineCount} online`;
});
</script>