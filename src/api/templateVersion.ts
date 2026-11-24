import request from './request'

/** 统一返回结构 */
export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

/** 版本列表项 */
export interface VersionItem {
  id: number
  templateId: number
  templateName: string
  versionNo: string
  changeSummary: string
  creator: string
  createTime: string
}

/** 快照字段 */
export interface SnapshotField {
  fieldName: string
  required: number
  fieldType: string
  formatRule?: string
  sort?: number
}

/** 快照数据 */
export interface SnapshotData {
  templateId: number
  templateName: string
  outputScope: string
  deadline?: string
  status: number
  fields: SnapshotField[]
}

/** 版本快照（含明细） */
export interface VersionSnapshot extends VersionItem {
  snapshot?: SnapshotData
}

/** 分页结果 */
export interface VersionPage {
  list: VersionItem[]
  total: number
}

/** 列表查询参数 */
export interface VersionQuery {
  pageNum: number
  pageSize: number
  templateName?: string
  versionNo?: string
}

/** 分页查询 GET /version/list（公开） */
export function getVersionPage(params: VersionQuery) {
  return request.get<never, ApiResult<VersionPage>>('/version/list', { params })
}

/** 版本快照 GET /version/{id}/snapshot（公开） */
export function getVersionSnapshot(id: number) {
  return request.get<never, ApiResult<VersionSnapshot>>(`/version/${id}/snapshot`)
}

/** 生成新版本 POST /version/generate（机构管理员/监管员专属） */
export function generateVersion(data: { templateId: number; changeSummary?: string }) {
  return request.post<never, ApiResult<VersionSnapshot>>('/version/generate', data)
}

/** 删除 DELETE /version/{id}（机构管理员/监管员专属） */
export function deleteVersion(id: number) {
  return request.delete<never, ApiResult<null>>(`/version/${id}`)
}
