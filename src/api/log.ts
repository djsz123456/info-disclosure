import request from './request'

export interface LogItem {
  id: number
  username: string
  type: string
  typeLabel: string
  detail: string | null
  createTime: string
}

export interface PageResult<T> {
  list: T[]
  total: number
}

export interface LogQuery {
  pageNum: number
  pageSize: number
  username?: string
  type?: string
}

export function getLogPage(params: LogQuery) {
  return request.get<never, { code: number; msg: string; data: PageResult<LogItem> }>(
    '/system/log/list',
    { params },
  )
}
