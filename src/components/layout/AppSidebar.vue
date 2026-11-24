<template>
  <el-menu
      :collapse="props.collapse"
      router
      default-active="$route.path"
      background-color="#081931"
      text-color="#fff"
      active-text-color="#409EFF"
      class="sidebar-menu"
  >
    <el-menu-item index="/">
      <el-icon><HomeFilled /></el-icon>
      <span>系统首页</span>
    </el-menu-item>

    <el-sub-menu index="system">
      <template #title>
        <el-icon><Setting /></el-icon>
        <span>系统管理</span>
      </template>
      <el-menu-item index="/system/user">
        <span>用户管理</span>
      </el-menu-item>
      <el-menu-item index="/system/role">
        <span>角色权限说明</span>
      </el-menu-item>
      <el-menu-item index="/system/password">
        <span>修改密码</span>
      </el-menu-item>
      <el-menu-item index="/system/log">
        <span>操作日志</span>
      </el-menu-item>
    </el-sub-menu>

    <el-menu-item index="/org">
      <el-icon><OfficeBuilding /></el-icon>
      <span>机构管理</span>
    </el-menu-item>

    <el-sub-menu index="template">
      <template #title>
        <el-icon><Document /></el-icon>
        <span>模板管理</span>
      </template>
      <el-menu-item index="/templateDefine">
        <span>模板定义</span>
      </el-menu-item>
      <el-menu-item index="/checkScore">
        <span>规则配置</span>
      </el-menu-item>
      <el-menu-item index="/templateVersion">
        <span>版本管理</span>
      </el-menu-item>
    </el-sub-menu>

    <el-menu-item index="/import">
      <el-icon><Upload /></el-icon>
      <span>信息披露导入</span>
    </el-menu-item>
    <el-menu-item index="/engine">
      <el-icon><Cpu /></el-icon>
      <span>合规检查引擎</span>
    </el-menu-item>
    <el-menu-item index="/result">
      <el-icon><DataAnalysis /></el-icon>
      <span>合规结果输出</span>
    </el-menu-item>
    <el-menu-item index="/supervision">
      <el-icon><Monitor /></el-icon>
      <span>监管视图</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
const props = defineProps<{
  collapse: boolean
}>()

import {
  HomeFilled,
  Setting,
  OfficeBuilding,
  Document,
  Upload,
  Cpu,
  DataAnalysis,
  Monitor
} from '@element-plus/icons-vue'
</script>

<style scoped>
.sidebar-menu {
  height: 100%;
  border-right: none;
}
</style>
