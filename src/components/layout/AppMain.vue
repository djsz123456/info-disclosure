<script setup lang="ts">
import GuestNotice from '@/components/common/GuestNotice.vue'
</script>

<template>
  <div class="app-main">
    <GuestNotice />
    <router-view />
  </div>
</template>

<style scoped>
.app-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
