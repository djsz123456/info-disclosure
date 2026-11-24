<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, SwitchButton, Key, Fold, Expand } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

defineProps<{ collapse: boolean }>()
const emit = defineEmits<{ (e: 'toggleCollapse'): void }>()

const router = useRouter()
const userStore = useUserStore()

function handleLogout() {
  userStore.logout()
  ElMessage.success('已注销登录，当前为游客模式')
  router.push('/')
}
</script>

<template>
  <div class="app-header">
    <div class="app-header__left">
      <el-icon class="app-header__toggle" @click="emit('toggleCollapse')">
        <Expand v-if="collapse" />
        <Fold v-else />
      </el-icon>
      <span class="app-header__logo">信</span>
      <span class="app-header__name">互联网金融机构信息披露合规检查系统</span>
    </div>

    <div class="app-header__actions">
      <template v-if="userStore.isLoggedIn">
        <el-tag type="success" effect="plain">{{ userStore.roleLabel }}</el-tag>
        <span class="app-header__username">{{ userStore.userInfo?.username }}</span>
        <el-button type="primary" link :icon="Key" @click="router.push('/system/password')">
          修改密码
        </el-button>
        <el-button type="danger" link :icon="SwitchButton" @click="handleLogout">
          解绑
        </el-button>
      </template>
      <template v-else>
        <el-tag type="warning" effect="plain">游客</el-tag>
        <el-button type="primary" :icon="User" @click="router.push('/login')">登录</el-button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 20px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-header__toggle {
  font-size: 20px;
  color: #5a6b7f;
  cursor: pointer;
  transition: color 0.2s ease;
}

.app-header__toggle:hover {
  color: #1890ff;
}

.app-header__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  border-radius: 8px;
}

.app-header__name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-header__username {
  color: #606266;
}
</style>
