<template>
  <div class="layout-container">
    <NuxtLoadingIndicator :height="3" color="#3b82f6" />
    <slot />
  </div>
</template>

<style>
.layout-container {
  @apply min-h-screen bg-gray-50;
}
</style>