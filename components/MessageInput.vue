<template>
  <div class="p-4 bg-gray-50 border-t">
    <div class="flex items-center space-x-2">
      <input
        :value="modelValue"
        type="text"
        placeholder="Type a message"
        class="flex-1 rounded-full py-2 px-4 border focus:outline-none focus:border-blue-500"
        @input="$emit('update:modelValue', $event.target.value)"
        @keyup.enter="$emit('send-message')"
      />
      <ClientOnly>
        <button
          class="send-button"
          :disabled="disabled"
          @click="$emit('send-message')"
        >
          <SendIcon />
        </button>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup>

import SendIcon from '~/components/icons/SendIcon.vue';

defineProps({
  modelValue: String,
  disabled: Boolean
});

defineEmits(['update:modelValue', 'send-message']);
</script>

<style scoped>
.send-button {
  @apply w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}
</style>