import request from './request'

export interface LoginParams {
  username: string
  password: string
  captcha: string
  /** 验证码凭据（后端无状态校验用） */
  captchaId: string
}

export interface CaptchaResult {
  code: number
  msg: string
  data: {
    captchaId: string
    captcha: string
  }
}

export function getCaptcha() {
  return request.get<never, CaptchaResult>('/auth/captcha')
}

export interface LoginResult {
  code: number
  msg: string
  data: {
    token: string
    user: {
      username: string
      role: string
      institutionId: number | null
    }
  }
}

export function login(data: LoginParams) {
  return request.post<never, LoginResult>('/auth/login', data)
}

export interface ChangePasswordParams {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export function changePassword(data: ChangePasswordParams) {
  return request.post<never, { code: number; msg: string; data: null }>(
    '/auth/change-password',
    data,
  )
}
