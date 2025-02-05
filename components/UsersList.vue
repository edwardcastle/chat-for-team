<template>
  <div class="p-4 bg-gray-50 border-b">
    <h2 class="text-sm font-semibold text-gray-500 mb-2">Direct Messages</h2>
    <div
      v-for="user in users"
      :key="user.user_id"
      class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
    >
      <UserAvatar :user="user" :is-online="isUserOnline(user.user_id)" />
      <div class="ml-3">
        <span class="text-gray-700">{{ user.username }}</span>
        <p v-if="!isUserOnline(user.user_id)" class="text-xs text-gray-500">
          {{ user.last_seen ? `Last seen ${formatTime(user.last_seen)}` : 'Never active' }}
        </p>
        <p v-else class="text-xs text-gray-500">{{ 'Online' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatTime } from '@/utils/dateUtils';

defineProps({
  users: Array,
  isUserOnline: Function
});
</script>