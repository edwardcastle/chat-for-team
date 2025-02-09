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
      class="flex-1"
      @select-dm="$emit('select-dm', $event)"
    />
  </div>
</template>

<script setup>
defineProps({
  channels: Array,
  dmChannels: Array,
  users: Array,
  currentChannel: Object,
  isUserOnline: Function
});

defineEmits(['select-channel', 'select-dm']);
</script>