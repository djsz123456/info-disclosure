import request from './request'

/** 统一返回结构 */
export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[]
  total: number
}

/** 结果列表行 */
export interface ReportResult {
  resultId: number
  batchId: number
  batchNo: string
  orgId: number
  orgName: string
  templateId: number
  templateName: string
  score: number
  status: number // 1合格 2预警 3不合格
  issueCount: number
  checkTime: string
}

/** 指标卡片 */
export interface ReportMetrics {
  totalCount: number
  passRate: number
  warnRate: number
  failRate: number
  avgScore: number
}

/** 问题项（报告/抽屉复用） */
export interface ReportIssue {
  id: number
  ruleName: string
  fieldName: string
  ruleDesc: string
  actualValue: string
  expectedValue: string
  deductScore: number
  suggestion: string
}

/** 报告预览数据 */
export interface ReportPreview {
  batchNo: string
  orgName: string
  creditCode: string
  templateName: string
  checkTime: string
  score: number
  status: number
  issueCount: number
  totalCount: number
  issues: ReportIssue[]
}

/** 列表响应：指标 + 分页 */
export interface ReportListData {
  metrics: ReportMetrics
  page: PageResult<ReportResult>
}

/** 列表查询参数 */
export interface ReportListParams {
  pageNum: number
  pageSize: number
  batchId?: number
  orgName?: string
  templateId?: number
  status?: number
  startTime?: string
  endTime?: string
}

/** 结果分页 + 指标 GET /report/list */
export function getReportList(params: ReportListParams) {
  return request.get<never, ApiResult<ReportListData>>('/report/list', { params })
}

/** 报告预览 GET /report/preview */
export function getReportPreview(resultId: number) {
  return request.get<never, ApiResult<ReportPreview>>('/report/preview', { params: { resultId } })
}

/** 导出报告 GET /report/export（返回 blob） */
export function exportReport(params: { batchId?: number; orgId?: number }) {
  return request.get<never, Blob>('/report/export', { params, responseType: 'blob' })
}
