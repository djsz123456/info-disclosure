import request from './request'

/** 统一返回结构 */
export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

/** 字段配置项 */
export interface TemplateField {
  id?: number
  fieldName: string
  required: number // 1必填 0选填
  fieldType: string
  formatRule?: string
  sort?: number
}

/** 模板列表项 */
export interface TemplateItem {
  id: number
  code: string
  name: string
  outputScope: string
  deadline: string
  status: number
  requiredFieldCount: number
  createTime?: string
  updateTime?: string
  fields?: TemplateField[]
}

/** 分页结果 */
export interface TemplatePage {
  list: TemplateItem[]
  total: number
}

/** 列表查询参数 */
export interface TemplateQuery {
  pageNum: number
  pageSize: number
  name?: string
  status?: number
  outputScope?: string
}

/** 新增/编辑入参 */
export interface TemplateSaveData {
  id?: number
  name: string
  outputScope: string
  deadline: string
  status: number
  fields: TemplateField[]
}

/** 分页查询 GET /supervise/template/list（公开） */
export function getTemplatePage(params: TemplateQuery) {
  return request.get<never, ApiResult<TemplatePage>>('/supervise/template/list', { params })
}

/** 详情 GET /supervise/template/{id}（公开，含字段明细） */
export function getTemplateDetail(id: number) {
  return request.get<never, ApiResult<TemplateItem>>(`/supervise/template/${id}`)
}

/** 新增 POST /supervise/template/add（机构管理员/监管员专属） */
export function addTemplate(data: TemplateSaveData) {
  return request.post<never, ApiResult<null>>('/supervise/template/add', data)
}

/** 编辑 PUT /supervise/template/update（机构管理员/监管员专属） */
export function updateTemplate(data: TemplateSaveData) {
  return request.put<never, ApiResult<null>>('/supervise/template/update', data)
}

/** 删除 DELETE /supervise/template/{id}（机构管理员/监管员专属） */
export function deleteTemplate(id: number) {
  return request.delete<never, ApiResult<null>>(`/supervise/template/${id}`)
}

/** 启用/停用 PATCH /supervise/template/{id}/status（机构管理员/监管员专属） */
export function changeTemplateStatus(id: number, status: number) {
  return request.patch<never, ApiResult<null>>(`/supervise/template/${id}/status`, null, {
    params: { status },
  })
}
