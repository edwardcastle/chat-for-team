<template>
  <div class="p-4 bg-gray-50 border-b">
    <h2 class="text-sm font-semibold text-gray-500 mb-2">Channels</h2>
    <div
      v-for="channel in filteredChannels"
      :key="channel.id"
      class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
      :class="{ 'bg-gray-100': currentChannel?.id === channel.id }"
      @click="handleChannelClick(channel.id)"
    >
      <div class="channel-icon">
        #
      </div>
      <span class="ml-3 text-gray-700">{{ channel.name }}</span>

      <!-- Unread message badge -->
      <div
        v-if="getUnreadCount(channel.id) > 0"
        class="ml-auto bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full"
      >
        {{ getUnreadCount(channel.id) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  channels: Array,
  currentChannel: Object
});

const emit = defineEmits(['select-channel']);

const { getUnreadCount, markChannelAsRead } = useUnreadMessages();

const filteredChannels = computed(() =>
  props.channels?.filter(channel => channel.type !== 'dm') || []
);

const handleChannelClick = (channelId) => {
  emit('select-channel', channelId);
  markChannelAsRead(channelId);
};

</script>

<style scoped>
.channel-icon {
  @apply w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center;
}
</style>