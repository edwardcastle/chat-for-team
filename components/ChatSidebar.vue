<template>
  <div class="w-1/5 border-r bg-white flex flex-col">
    <ChannelsList
      :channels="channels"
      :current-channel="currentChannel"
      @select-channel="$emit('select-channel', $event)"
    />

    <UsersList
      :users="users"
      :dm-channels="dmChannels"
      :is-user-online="isUserOnline"
      :get-unread-count="getUnreadCount"
      class="flex-1"
      @select-dm="$emit('select-dm', $event)"
    />
  </div>
</template>

<script setup>
import { useUnreadMessages } from '~/composables/useUnreadMessage.js';

const props = defineProps({
  channels: Array,
  dmChannels: Array,
  users: Array,
  currentChannel: Object,
  isUserOnline: Function,
  getUnreadCount: Function
});

defineEmits(['select-channel', 'select-dm']);

watch(
  () => props.dmChannels,
  (newDmChannels) => {
    if (newDmChannels.length > 0) {
      useUnreadMessages().loadUnreadCounts();
    }
  },
  { deep: true }
);
</script>