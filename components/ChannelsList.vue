<template>
  <div class="p-4 bg-gray-50 border-b">
    <h2 class="text-sm font-semibold text-gray-500 mb-2">Channels</h2>
    <div
      v-for="channel in filteredChannels"
      :key="channel.id"
      class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
      :class="{ 'bg-gray-100': currentChannel?.id === channel.id }"
      @click="$emit('select-channel', channel.id)"
    >
      <div class="channel-icon">
        #
      </div>
      <span class="ml-3 text-gray-700">{{ channel.name }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  channels: Array,
  currentChannel: Object
});

const filteredChannels = computed(() =>
  props.channels?.filter(channel => channel.type !== 'dm') || []
);

</script>

<style scoped>
.channel-icon {
  @apply w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center;
}
</style>