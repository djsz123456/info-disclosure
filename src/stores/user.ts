import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { login as loginApi } from '@/api/auth'

export type Role = 'supervisor' | 'orgAdmin'

export interface UserInfo {
  username: string
  role: Role
  orgName: string
}

const ROLE_LABEL: Record<Role, string> = {
  supervisor: '监管员',
  orgAdmin: '机构管理员',
}

const TOKEN_KEY = 'info_token'
const USER_KEY = 'info_user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const token = ref<string | null>(null)

  const isLoggedIn = computed(() => token.value !== null && userInfo.value !== null)
  const role = computed<Role | 'guest'>(() => userInfo.value?.role ?? 'guest')
  const roleLabel = computed(() => (userInfo.value ? ROLE_LABEL[userInfo.value.role] : '游客'))
  // 所有操作按钮据此禁用：未登录 / 游客 => false
  const canOperate = computed(() => isLoggedIn.value)

  function initFromStorage() {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)
    token.value = savedToken
    if (savedUser) {
      try {
        userInfo.value = JSON.parse(savedUser) as UserInfo
      } catch {
        userInfo.value = null
      }
    }
  }

  async function login(
    username: string,
    password: string,
    captcha: string,
    captchaId: string,
  ): Promise<void> {
    const res = await loginApi({ username, password, captcha, captchaId })
    token.value = res.data.token
    userInfo.value = {
      username: res.data.user.username,
      role: res.data.user.role === 'REGULATOR' ? 'supervisor' : 'orgAdmin',
      orgName:
        res.data.user.institutionId == null ? '监管总局' : `机构 ${res.data.user.institutionId}`,
    }
    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo.value))
  }

  function logout(): void {
    token.value = null
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function changePassword(oldPassword: string, newPassword: string): boolean {
    // 预留接口调用位置：真实项目中在此调用修改密码接口
    return Boolean(oldPassword && newPassword)
  }

  initFromStorage()

  return {
    userInfo,
    token,
    isLoggedIn,
    role,
    roleLabel,
    canOperate,
    login,
    logout,
    changePassword,
  }
})
