import request from './request'

export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

export interface UserItem {
  id: number
  username: string
  role: string
  roleLabel: string
  institution: string
  institutionId: number | null
  status: number
}

export interface PageResult<T> {
  list: T[]
  total: number
}

export interface Institution {
  id: number
  orgName: string
}

export interface UserQuery {
  pageNum: number
  pageSize: number
  username?: string
  institution?: string
}

export interface UserSaveData {
  id?: number
  username: string
  password?: string
  role: string
  institutionId: number | null
  status: number
}

export function getUserPage(params: UserQuery) {
  return request.get<never, ApiResult<PageResult<UserItem>>>('/system/user/list', { params })
}

export function addUser(data: UserSaveData) {
  return request.post<never, ApiResult<null>>('/system/user/add', data)
}

export function updateUser(data: UserSaveData) {
  return request.put<never, ApiResult<null>>('/system/user/edit', data)
}

export function deleteUser(id: number) {
  return request.delete<never, ApiResult<null>>(`/system/user/delete/${id}`)
}

export function changeUserStatus(id: number, status: number) {
  return request.put<never, ApiResult<null>>(`/system/user/changeStatus/${id}/${status}`)
}

export function getInstitutions() {
  return request.get<never, ApiResult<Institution[]>>('/system/institution/list')
}
