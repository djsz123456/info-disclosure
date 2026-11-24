<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { OfficeBuilding, User, Message, Lock, CircleCheck } from '@element-plus/icons-vue'
import { getCaptcha } from '@/api/auth'
import { registerOrg, sendEmailCode } from '@/api/orgApply'

const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const captchaText = ref('')
const captchaId = ref('')
const sendingCode = ref(false)
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const form = reactive({
  orgName: '',
  legalPerson: '',
  idCard: '',
  email: '',
  emailCode: '',
  graphCode: '',
  password: '',
  confirmPassword: '',
})

// 18位身份证号
const IDCARD_RE = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/

const rules: FormRules = {
  orgName: [{ required: true, message: '请输入机构名称', trigger: 'blur' }],
  legalPerson: [{ required: true, message: '请输入法人姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入法人身份证号', trigger: 'blur' },
    { pattern: IDCARD_RE, message: '身份证号格式错误（18位）', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入联系邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  emailCode: [
    { required: true, message: '请输入邮箱验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' },
  ],
  graphCode: [{ required: true, message: '请输入图形验证码', trigger: 'blur' }],
  password: [
    {
      validator: (_rule, value, callback) => {
        if (value && value.length < 6) {
          callback(new Error('初始密码至少6位（可不填，默认123456）'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      validator: (_rule, value, callback) => {
        if (form.password && value !== form.password) {
          callback(new Error('两次输入的初始密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

async function refreshCaptcha() {
  try {
    const res = await getCaptcha()
    captchaText.value = res.data.captcha
    captchaId.value = res.data.captchaId
    form.graphCode = ''
  } catch (e) {
    ElMessage.error((e as Error).message || '验证码加载失败')
  }
}

async function handleSendCode() {
  if (!form.email) {
    ElMessage.warning('请先填写联系邮箱')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    ElMessage.warning('邮箱格式不正确')
    return
  }
  if (!form.graphCode) {
    ElMessage.warning('请先输入图形验证码')
    return
  }
  sendingCode.value = true
  try {
    const res = await sendEmailCode(form.email, form.graphCode, captchaId.value)
    ElMessage.success(`验证码已发送至 ${form.email}（Mock 环境验证码：${res.data.code}）`)
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  } catch (e) {
    ElMessage.error((e as Error).message || '发送失败')
    refreshCaptcha()
  } finally {
    sendingCode.value = false
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    await registerOrg({
      orgName: form.orgName,
      legalPerson: form.legalPerson,
      idCard: form.idCard,
      email: form.email,
      emailCode: form.emailCode,
      graphCode: form.graphCode,
      graphCaptchaId: captchaId.value,
      password: form.password || undefined,
    })
    ElMessage.success('提交成功，请等待监管员审核')
    setTimeout(() => router.push('/login'), 1200)
  } catch (e) {
    ElMessage.error((e as Error).message || '提交失败')
    refreshCaptcha()
  } finally {
    submitting.value = false
  }
}

onMounted(refreshCaptcha)
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="register">
    <!-- 左侧：流程说明 -->
    <div class="register__left">
      <div class="intro">
        <div class="intro__badge">机构入驻</div>
        <h1 class="intro__title">互联网金融机构<br />信息披露合规检查系统</h1>
        <p class="intro__desc">提交入驻申请，经监管员审核通过后自动生成统一社会信用代码并开通机构账号。</p>

        <div class="steps">
          <div class="step">
            <span class="step__num">1</span>
            <div>
              <div class="step__title">填写资料</div>
              <div class="step__desc">机构信息 / 法人信息 / 联系邮箱</div>
            </div>
          </div>
          <div class="step">
            <span class="step__num">2</span>
            <div>
              <div class="step__title">邮箱验证</div>
              <div class="step__desc">6位验证码，5分钟内有效</div>
            </div>
          </div>
          <div class="step">
            <span class="step__num">3</span>
            <div>
              <div class="step__title">监管审核</div>
              <div class="step__desc">通过后自动生成信用代码与账号</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：申请表单 -->
    <div class="register__right">
      <div class="form-card">
        <div class="form-card__head">
          <h2>机构入驻申请</h2>
          <span class="form-card__back" @click="router.push('/login')">已有账号？返回登录</span>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-divider content-position="left">机构信息</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="机构名称" prop="orgName">
                <el-input v-model="form.orgName" :prefix-icon="OfficeBuilding" placeholder="请输入机构名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="统一社会信用代码">
                <el-input disabled placeholder="提交后由系统审核通过时自动生成" />
                <div class="field-tip">信用代码由系统后台自动生成，无需填写</div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">法人信息</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="法人姓名" prop="legalPerson">
                <el-input v-model="form.legalPerson" :prefix-icon="User" placeholder="请输入法人姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="法人身份证号" prop="idCard">
                <el-input v-model="form.idCard" placeholder="18位身份证号" maxlength="18" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">联系与验证</el-divider>
          <el-form-item label="联系邮箱" prop="email">
            <el-input v-model="form.email" :prefix-icon="Message" placeholder="用于接收验证码" />
          </el-form-item>
          <el-form-item label="邮箱验证码" prop="emailCode">
            <div class="code-row">
              <el-input v-model="form.emailCode" placeholder="6位数字验证码" maxlength="6" />
              <el-button
                class="code-btn"
                type="primary"
                plain
                :loading="sendingCode"
                :disabled="countdown > 0"
                @click="handleSendCode">
                {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="图形验证码" prop="graphCode">
            <div class="code-row">
              <el-input v-model="form.graphCode" placeholder="请输入图形验证码" maxlength="4" />
              <div class="captcha-box" title="点击刷新" @click="refreshCaptcha">{{ captchaText }}</div>
            </div>
          </el-form-item>

          <el-divider content-position="left">账户（可选）</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="初始密码" prop="password">
                <el-input v-model="form.password" type="password" :prefix-icon="Lock" placeholder="不填默认 123456" show-password />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input v-model="form.confirmPassword" type="password" :prefix-icon="Lock" placeholder="再次输入初始密码" show-password />
              </el-form-item>
            </el-col>
          </el-row>

          <el-button
            type="primary"
            class="submit-btn"
            :icon="CircleCheck"
            :loading="submitting"
            @click="handleSubmit">
            {{ submitting ? '提交中...' : '提交入驻申请' }}
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register {
  display: flex;
  min-height: 100vh;
}

.register__left {
  flex: 0 0 42%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px;
  background: linear-gradient(150deg, #0f2a4a 0%, #14507a 55%, #1a6ea8 100%);
  color: #fff;
}

.intro__badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 13px;
  color: #aee3ff;
  border: 1px solid rgba(174, 227, 255, 0.5);
  border-radius: 999px;
  margin-bottom: 20px;
}

.intro__title {
  margin: 0 0 16px;
  font-size: 30px;
  line-height: 1.35;
  font-weight: 700;
}

.intro__desc {
  margin: 0 0 40px;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.75);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.step__num {
  flex: none;
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #0f2a4a;
  background: #fff;
  border-radius: 50%;
}

.step__title {
  font-size: 15px;
  font-weight: 600;
}

.step__desc {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.register__right {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 48px;
  background: #f5f7fa;
  overflow-y: auto;
}

.form-card {
  width: 100%;
  max-width: 680px;
  padding: 28px 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(15, 42, 74, 0.08);
}

.form-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.form-card__head h2 {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
}

.form-card__back {
  font-size: 13px;
  color: #1890ff;
  cursor: pointer;
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.code-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.code-btn {
  flex: none;
  width: 130px;
}

.captcha-box {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 32px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff, #f0faff);
  border: 1px dashed #91caff;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.submit-btn {
  width: 100%;
  height: 44px;
  margin-top: 8px;
  font-size: 15px;
  font-weight: 500;
  background: linear-gradient(135deg, #14507a 0%, #1a6ea8 100%);
  border: none;
  border-radius: 8px;
}

@media (max-width: 900px) {
  .register {
    flex-direction: column;
  }
  .register__left {
    flex: none;
    padding: 32px 24px;
  }
  .register__right {
    padding: 24px 16px;
  }
}
</style>
