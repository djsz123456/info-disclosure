import request from './request'

/** 统一返回结构 */
export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

/** 入驻申请列表项 */
export interface OrgApplyItem {
  id: number
  orgName: string
  legalPerson: string
  idCard: string
  email: string
  status: number // 0待审 1通过 2拒绝
  reason?: string
  orgId?: number
  userId?: number
  /** 统一社会信用代码（审核通过后生成，待审为 null → 前端显示「待生成」） */
  creditCode?: string | null
  createTime?: string
}

export interface ApplyPage {
  list: OrgApplyItem[]
  total: number
}

/** 审核通过结果 */
export interface ApproveResult {
  orgId: number
  orgName: string
  creditCode: string
  userId: number
  username: string
  password: string
}

/** 申请表单入参（不含信用代码，审核时后台生成） */
export interface RegisterOrgData {
  orgName: string
  legalPerson: string
  idCard: string
  email: string
  emailCode: string
  graphCode: string
  /** 图形验证码凭据（后端无状态校验用） */
  graphCaptchaId: string
  password?: string
}

/** 发送邮箱验证码 POST /apply/send-email-code（需图形码） */
export function sendEmailCode(email: string, graphCode: string, graphCaptchaId: string) {
  return request.post<never, ApiResult<{ code: string }>>('/apply/send-email-code', {
    email,
    graphCode,
    graphCaptchaId,
  })
}

/** 提交入驻申请 POST /apply/register */
export function registerOrg(data: RegisterOrgData) {
  return request.post<never, ApiResult<null>>('/apply/register', data)
}

/** 分页查询入驻申请 GET /supervisor/apply/list */
export function getApplyList(params: { pageNum: number; pageSize: number; status?: number }) {
  return request.get<never, ApiResult<ApplyPage>>('/supervisor/apply/list', { params })
}

/** 审核通过 POST /supervisor/apply/approve（后台生成信用代码+建机构+建账号） */
export function approveApply(applyId: number) {
  return request.post<never, ApiResult<ApproveResult>>('/supervisor/apply/approve', { applyId })
}

/** 审核拒绝 POST /supervisor/apply/reject */
export function rejectApply(applyId: number, reason: string) {
  return request.post<never, ApiResult<null>>('/supervisor/apply/reject', { applyId, reason })
}
