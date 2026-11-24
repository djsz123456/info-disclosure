<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string) ?? '')
</script>

<template>
  <el-card>
    <el-result
      icon="info"
      :title="`${title}（模块页面结构待搭建）`"
      sub-title="本课设仅实现「系统管理」模块，其余模块页面结构预留。"
    >
      <template #extra>
        <el-tag>待开发</el-tag>
      </template>
    </el-result>
  </el-card>
</template>
