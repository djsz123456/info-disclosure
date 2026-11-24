<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
</script>

<template>
  <el-alert
    v-if="!userStore.isLoggedIn"
    class="guest-notice"
    title="当前为游客模式：可浏览页面结构与示例数据，所有操作按钮已禁用，请登录后进行相关操作。"
    type="warning"
    show-icon
    :closable="false"
  />
</template>

<style scoped>
.guest-notice {
  flex-shrink: 0;
  border: 1px solid #ffd591;
  border-radius: 12px;
}
</style>
