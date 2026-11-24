import request from './request'

/** 统一返回结构 */
export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

/** 检查记录列表项 */
export interface CheckItem {
  id: number
  templateId: number
  templateName: string
  institutionId: number
  requiredRate: number
  formatRate: number
  score: number
  status: number // 1通过 0不通过 2待检
  remark: string
  operator: string
  checkTime: string
}

/** 分页结果 */
export interface CheckPage {
  list: CheckItem[]
  total: number
}

/** 列表查询参数 */
export interface CheckQuery {
  pageNum: number
  pageSize: number
  templateName?: string
  institutionId?: number
  status?: number
}

/** 机构下拉项 */
export interface InstitutionOption {
  id: number
  orgName: string
}

/** 分页查询 GET /check/list（公开） */
export function getCheckPage(params: CheckQuery) {
  return request.get<never, ApiResult<CheckPage>>('/check/list', { params })
}

/** 详情 GET /check/{id}（公开） */
export function getCheckDetail(id: number) {
  return request.get<never, ApiResult<CheckItem>>(`/check/${id}`)
}

/** 可检查机构列表 GET /check/institutions（公开） */
export function getInstitutions() {
  return request.get<never, ApiResult<InstitutionOption[]>>('/check/institutions')
}

/** 执行合规检查 POST /check/execute（机构管理员/监管员专属） */
export function executeCheck(data: { templateId: number; institutionId: number }) {
  return request.post<never, ApiResult<CheckItem>>('/check/execute', data)
}

/** 删除 DELETE /check/{id}（机构管理员/监管员专属） */
export function deleteCheck(id: number) {
  return request.delete<never, ApiResult<null>>(`/check/${id}`)
}
