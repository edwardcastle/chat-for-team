<template>
  <div class="w-1/4 border-r bg-white flex flex-col">
    <!-- Channels Section -->
    <ChannelsList
      :channels="channels"
      :current-channel="currentChannel"
      @select-channel="$emit('select-channel', $event)"
    />

    <!-- Users Section -->
    <UsersList
      :users="users"
      :is-user-online="isUserOnline"
      class="flex-1"
    />
  </div>
</template>

<script setup>
defineProps({
  channels: Array,
  users: Array,
  currentChannel: Object,
  isUserOnline: Function
});

defineEmits(['select-channel']);
</script>