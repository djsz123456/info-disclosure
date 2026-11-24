import request from './request'

/** 统一返回结构 */
export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

/** 机构列表项（与后端 SysInstitution 字段对应） */
export interface OrgItem {
  id: number
  orgName: string
  creditCode: string
  contactPerson: string
  phone: string
  address: string | null
  status: number
  createTime?: string
  updateTime?: string
}

/** 分页结果 */
export interface OrgPage {
  list: OrgItem[]
  total: number
}

/** 列表查询参数 */
export interface OrgQuery {
  pageNum: number
  pageSize: number
  orgName?: string
}

/** 新增/编辑入参（信用代码、联系人由后端生成） */
export interface OrgSaveData {
  id?: number
  orgName: string
  phone: string
  address?: string
  status: number
}

/** 分页查询机构列表 GET /org/list */
export function getOrgPage(params: OrgQuery) {
  return request.get<never, ApiResult<OrgPage>>('/org/list', { params })
}

/** 新增机构 POST /org/add */
export function addOrg(data: OrgSaveData) {
  return request.post<never, ApiResult<null>>('/org/add', data)
}

/** 编辑机构 PUT /org/update */
export function updateOrg(data: OrgSaveData) {
  return request.put<never, ApiResult<null>>('/org/update', data)
}

/** 删除机构 DELETE /org/delete/{id} */
export function deleteOrg(id: number) {
  return request.delete<never, ApiResult<null>>(`/org/delete/${id}`)
}
