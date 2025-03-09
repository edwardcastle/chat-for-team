<template>
  <div class="p-4 bg-gray-50 border-b relative">
    <h2 class="text-sm font-semibold text-gray-500 mb-2">Direct Messages</h2>
    <div
      v-for="user in users"
      :key="user.user_id"
    >
      <div
        v-if="currentUserId === user.user_id"
        class="flex items-center p-2 hover:bg-gray-100 w-auto cursor-pointer transition-colors absolute bottom-3"
      >
        <UserAvatar
          :user="user"
          :is-online="isUserOnline(user.user_id)"
        />
        <span class="ml-3 text-gray-700">
          {{ user.username }}
        </span>
      </div>

      <!-- Other users -->
      <div
        v-else
        class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
        @click="handleUserClick(user)"
      >
        <UserAvatar
          :user="user"
          :is-online="isUserOnline(user.user_id)"
        />
        <div class="ml-3">
          <span class="text-gray-700">{{ user.username }}</span>
          <p v-if="!isUserOnline(user.user_id)" class="text-xs text-red-500">
            {{ formatLastSeen(user.last_seen) }}
          </p>
          <p v-else class="text-xs text-green-500">Online</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OnlineUser } from '~/types/database.types';

defineProps({
  users: {
    type: Array as PropType<OnlineUser[]>,
    default: () => []
  },
  dmChannels: {
    type: Array,
    default: () => []
  },
  isUserOnline: {
    type: Function as PropType<(userId: string) => boolean>,
    required: true
  }
});

const emit = defineEmits(['select-dm']);

const { currentUserId } = useUser();
const { createOrGetDMChannel } = useDirectMessages();

const handleUserClick = async (user: OnlineUser): Promise<void> => {
  try {
    const channel = await createOrGetDMChannel(user.user_id);

    if (channel?.id) {
      emit('select-dm', channel.id);
    }
  } catch (error) {
    console.error('DM channel error:', error);
  }
};
</script>