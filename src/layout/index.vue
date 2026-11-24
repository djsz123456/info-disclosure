<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppMain from '@/components/layout/AppMain.vue'

const isCollapse = ref(false)
</script>

<template>
  <el-container class="app-layout">
    <el-header class="app-layout__header">
      <AppHeader :collapse="isCollapse" @toggle-collapse="isCollapse = !isCollapse" />
    </el-header>
    <el-container class="app-layout__body">
      <el-aside :width="isCollapse ? '64px' : '220px'" class="app-layout__aside">
        <AppSidebar :collapse="isCollapse" />
      </el-aside>
      <el-main class="app-layout__main">
        <AppMain />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-layout__header {
  height: 60px;
  padding: 0;
}

.app-layout__body {
  height: calc(100vh - 60px);
}

.app-layout__aside {
  height: 100%;
  overflow-y: auto;
  background-color: #001529;
  transition: width 0.3s ease;
}

.app-layout__main {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f7fa;
}
</style>
