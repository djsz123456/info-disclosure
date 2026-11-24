<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  UserFilled,
  Setting,
  OfficeBuilding,
  Document,
  Upload,
  Cpu,
  DataAnalysis,
  Monitor,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const modules = [
  {
    icon: Setting,
    title: '系统管理',
    desc: '用户、角色权限、修改密码、操作日志管理',
    path: '/system/user',
  },
  { icon: OfficeBuilding, title: '机构管理', desc: '互联网金融机构信息维护', path: '/org' },
  { icon: Document, title: '模板管理', desc: '信息披露模板维护', path: '/template' },
  { icon: Upload, title: '信息披露导入', desc: '导入机构披露信息', path: '/import' },
  { icon: Cpu, title: '合规检查引擎', desc: '自动合规检查', path: '/engine' },
  { icon: DataAnalysis, title: '合规结果输出', desc: '检查结果导出', path: '/result' },
  { icon: Monitor, title: '监管视图', desc: '监管视角数据总览', path: '/supervision' },
]
</script>

<template>
  <div class="home">
    <el-card v-if="userStore.isLoggedIn" class="home__welcome">
      <div class="home__welcome-inner">
        <el-icon class="home__welcome-icon"><UserFilled /></el-icon>
        <div>
          <div class="home__welcome-text">
            欢迎您，{{ userStore.roleLabel }}：{{ userStore.userInfo?.username }}
          </div>
          <div class="home__welcome-sub">所属机构：{{ userStore.userInfo?.orgName }}</div>
        </div>
      </div>
    </el-card>

    <el-card class="home__intro">
      <h2 class="home__intro-title">系统简介</h2>
      <p class="home__intro-desc">
        本系统面向互联网金融机构的信息披露合规检查场景，提供机构信息管理、披露模板管理、
        披露信息导入、自动合规检查、结果输出与监管视图等能力。本课设当前仅实现「系统管理」模块。
      </p>
    </el-card>

    <div class="home__modules-section">
      <h2 class="home__section-title">功能模块</h2>
      <div class="home__modules">
        <div v-for="m in modules" :key="m.title" class="home__module" @click="router.push(m.path)">
          <div class="home__module-icon">
            <el-icon><component :is="m.icon" /></el-icon>
          </div>
          <div class="home__module-title">{{ m.title }}</div>
          <div class="home__module-desc">{{ m.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 统一卡片圆角与阴影 */
.home :deep(.el-card) {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* 登录欢迎信息 */
.home__welcome-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.home__welcome-icon {
  font-size: 36px;
  color: #1890ff;
}

.home__welcome-text {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.home__welcome-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

/* 系统简介 */
.home__intro-title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.home__intro-desc {
  margin: 0;
  line-height: 1.8;
  color: #606266;
}

/* 功能模块 */
.home__section-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.home__modules {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.home__module {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  text-align: center;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.home__module:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.1);
}

.home__module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 14px;
  font-size: 26px;
  color: #1890ff;
  background-color: #e6f7ff;
  border-radius: 50%;
}

.home__module-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.home__module-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #909399;
}

@media (max-width: 900px) {
  .home__modules {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .home__modules {
    grid-template-columns: 1fr;
  }
}
</style>
