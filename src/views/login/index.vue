<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getCaptcha } from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const captchaText = ref('')
const captchaId = ref('')

const form = reactive({
  account: '',
  password: '',
  captcha: '',
  remember: false,
})

const rules: FormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' },
  ],
  captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

async function refreshCaptcha() {
  try {
    const res = await getCaptcha()
    captchaText.value = res.data.captcha
    captchaId.value = res.data.captchaId
    form.captcha = ''
  } catch (e) {
    ElMessage.error((e as Error).message || '验证码加载失败')
  }
}

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await userStore.login(form.account, form.password, form.captcha, captchaId.value)
    ElMessage.success(`登录成功，欢迎 ${userStore.roleLabel}：${form.account}`)
    router.push('/')
  } catch (e) {
    ElMessage.error((e as Error).message || '登录失败')
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(refreshCaptcha)
</script>

<template>
  <div class="login">
    <!-- 左侧：几何角色展示区 -->
    <div class="login__left">
      <div class="scene">
        <div class="char char--purple">
          <div class="char__eyes">
            <span class="eye"></span>
            <span class="eye"></span>
          </div>
        </div>
        <div class="char char--black">
          <div class="char__eyes">
            <span class="eye"></span>
            <span class="eye"></span>
          </div>
        </div>
        <div class="char char--orange">
          <div class="char__eyes">
            <span class="eye"></span>
            <span class="eye"></span>
          </div>
        </div>
        <div class="char char--yellow">
          <div class="char__eyes">
            <span class="eye"></span>
            <span class="eye"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：登录表单 -->
    <div class="login__right">
      <div class="form-wrap">
        <h1 class="form-title">欢迎登录</h1>
        <p class="form-sub">互联网金融机构信息披露合规检查系统</p>

        <el-form ref="formRef" :model="form" :rules="rules" class="form" @keyup.enter="handleLogin">
          <el-form-item prop="account">
            <el-input
              v-model="form.account"
              class="form-input"
              placeholder="请输入账号"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              class="form-input"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item prop="captcha">
            <div class="captcha-row">
              <el-input
                v-model="form.captcha"
                class="form-input captcha-input"
                placeholder="请输入验证码"
                maxlength="4"
                @keyup.enter="handleLogin"
              />
              <div class="captcha-box" title="点击刷新验证码" @click="refreshCaptcha">
                {{ captchaText }}
              </div>
            </div>
          </el-form-item>

          <div class="form-row">
            <el-checkbox v-model="form.remember">记住 30 天</el-checkbox>
          </div>

          <el-form-item>
            <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              :disabled="loading"
              @click="handleLogin"
            >
              {{ loading ? '正在登录...' : '登录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="register-row">
          <span class="register-tip">还没有机构账号？</span>
          <el-button link type="primary" @click="router.push('/register')">机构入驻申请</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  min-height: 100vh;
}

/* ============ 左侧角色展示区 ============ */
.login__left {
  flex: 0 0 50%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #f5f6f8 0%, #e7eaee 100%);
}

.scene {
  position: absolute;
  inset: 0;
}

.char {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.char__eyes {
  display: flex;
  gap: 12px;
}

.eye {
  position: relative;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 50%;
}

.eye::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  background: #1f2937;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

/* 紫色长方形 */
.char--purple {
  left: 14%;
  top: 18%;
  width: 72px;
  height: 120px;
  background: linear-gradient(180deg, #8b5cf6, #6d28d9);
  border-radius: 10px;
  box-shadow: 0 12px 24px rgba(109, 40, 217, 0.25);
  rotate: -8deg;
  animation: float 5s ease-in-out infinite;
}

/* 黑色长方形 */
.char--black {
  left: 40%;
  top: 42%;
  width: 112px;
  height: 56px;
  background: linear-gradient(180deg, #374151, #111827);
  border-radius: 8px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
  rotate: 5deg;
  z-index: 3;
  animation: float 6s ease-in-out 0.8s infinite;
}

/* 橙色半圆 */
.char--orange {
  left: 22%;
  top: 64%;
  width: 110px;
  height: 55px;
  background: linear-gradient(180deg, #ffa94d, #ff8c42);
  border-radius: 110px 110px 0 0;
  box-shadow: 0 12px 24px rgba(255, 140, 66, 0.28);
  rotate: -4deg;
  z-index: 2;
  animation: float 5.5s ease-in-out 0.4s infinite;
}

/* 黄色圆角矩形 */
.char--yellow {
  left: 66%;
  top: 24%;
  width: 84px;
  height: 84px;
  background: linear-gradient(180deg, #ffe066, #ffc93c);
  border-radius: 22px;
  box-shadow: 0 12px 24px rgba(255, 201, 60, 0.28);
  rotate: 8deg;
  animation: breathe 4.5s ease-in-out 1.2s infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-14px);
  }
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

/* ============ 右侧表单 ============ */
.login__right {
  flex: 0 0 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: #ffffff;
}

.form-wrap {
  width: 100%;
  max-width: 360px;
}

.form-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.form-sub {
  margin: 0 0 32px;
  font-size: 14px;
  color: #9ca3af;
}

.form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.form-input :deep(.el-input__wrapper) {
  height: 44px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #e5e7eb inset;
  transition: box-shadow 0.3s ease;
}

.form-input :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #1890ff inset,
    0 0 8px rgba(24, 144, 255, 0.25);
}

.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.captcha-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.captcha-input {
  flex: 1;
}

.captcha-box {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 110px;
  height: 44px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff, #f0faff);
  border: 1px dashed #91caff;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border: none;
  border-radius: 8px;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;
}

.login-btn:hover {
  transform: scale(1.02);
  filter: brightness(1.05);
}

.register-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
}

.register-tip {
  font-size: 13px;
  color: #9ca3af;
}

/* ============ 响应式：小屏上下布局 ============ */
@media (max-width: 900px) {
  .login {
    flex-direction: column;
  }

  .login__left {
    flex: none;
    width: 100%;
    height: 240px;
  }

  .login__right {
    flex: 1;
    width: 100%;
    padding: 40px 24px;
  }

  .char--purple {
    left: 10%;
    top: 20%;
    scale: 0.8;
  }

  .char--black {
    left: 42%;
    top: 34%;
    scale: 0.8;
  }

  .char--orange {
    left: 16%;
    top: 62%;
    scale: 0.8;
  }

  .char--yellow {
    left: 68%;
    top: 18%;
    scale: 0.8;
  }
}
</style>
