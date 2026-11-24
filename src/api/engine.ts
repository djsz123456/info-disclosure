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

/** 检查批次列表项 */
export interface CheckBatch {
  id: number
  batchNo: string
  templateId: number
  templateName: string
  dataBatchId: number | null
  dataBatchNo: string | null
  triggerType: number // 1手动 2定时
  scope: number // 1全量 2本机构
  orgId: number | null
  orgName: string | null
  totalCount: number
  passCount: number
  warnCount: number
  failCount: number
  status: number // 0进行中 1完成 2失败
  costTime: number | null
  createBy: string
  createTime: string
  finishTime: string | null
}

/** 机构合规结果列表项 */
export interface CheckResult {
  id: number
  batchId: number
  orgId: number
  orgName: string
  templateId: number
  templateName: string
  score: number
  status: number // 1合格 2预警 3不合格
  issueCount: number
  createTime: string
}

/** 问题项明细 */
export interface CheckIssue {
  id: number
  resultId: number
  ruleId: number
  ruleName: string
  fieldName: string
  ruleDesc: string
  actualValue: string
  expectedValue: string
  deductScore: number
  suggestion: string
  createTime: string
}

/** 规则命中统计项 */
export interface RuleHitStat {
  ruleId: number
  ruleName: string
  fieldName: string
  templateName: string
  hitCount: number
  totalCount: number
  hitRate: number
  avgDeduct: number
  hitOrgs: string[]
}

/** 执行日志项 */
export interface CheckLog {
  id: number
  batchId: number
  batchNo: string
  level: string
  message: string
  costTime: number | null
  createTime: string
}

/** 首页指标卡片 */
export interface CheckOverview {
  totalBatches: number
  latestBatchId: number | null
  latestBatchNo: string | null
  institutionCount: number
  passCount: number
  warnCount: number
  failCount: number
  passRate: number
}

/** 发起检查入参 */
export interface CheckStartParams {
  templateId: number
  dataBatchId?: number | null
  scope: 'ALL' | 'ORG'
  orgId?: number | null
}

/** 披露数据批次选项（复用导入批次历史，发起检查时选择） */
export interface DataBatchOption {
  id: number
  batchNo: string
  templateId: number
  templateName: string
  institutionName?: string
}

/** 批次详情 */
export interface CheckBatchDetail {
  batch: CheckBatch
  results: PageResult<CheckResult>
}

// ============ 接口 ============

/** 发起检查 POST /engine/start（监管员） */
export function startCheck(data: CheckStartParams) {
  return request.post<never, ApiResult<{ batchId: number; batchNo: string; totalCount: number; passCount: number; warnCount: number; failCount: number; costTime: number }>>('/engine/start', data)
}

/** 批次分页 GET /engine/batch/list */
export function getBatchList(params: {
  pageNum: number
  pageSize: number
  batchNo?: string
  templateName?: string
  status?: number
}) {
  return request.get<never, ApiResult<PageResult<CheckBatch>>>('/engine/batch/list', { params })
}

/** 批次详情 GET /engine/batch/detail */
export function getBatchDetail(batchId: number, pageNum = 1, pageSize = 10) {
  return request.get<never, ApiResult<CheckBatchDetail>>('/engine/batch/detail', {
    params: { batchId, pageNum, pageSize },
  })
}

/** 问题项列表 GET /engine/result/issues */
export function getResultIssues(resultId: number) {
  return request.get<never, ApiResult<CheckIssue[]>>('/engine/result/issues', {
    params: { resultId },
  })
}

/** 规则命中统计 GET /engine/rule/hit-stats（监管员） */
export function getRuleHitStats(batchId: number, topN = 10) {
  return request.get<never, ApiResult<RuleHitStat[]>>('/engine/rule/hit-stats', {
    params: { batchId, topN },
  })
}

/** 执行日志分页 GET /engine/log/list（监管员） */
export function getLogList(params: { batchId?: number; pageNum: number; pageSize: number }) {
  return request.get<never, ApiResult<PageResult<CheckLog>>>('/engine/log/list', { params })
}

/** 首页指标卡片 GET /engine/overview */
export function getOverview() {
  return request.get<never, ApiResult<CheckOverview>>('/engine/overview')
}

/** 披露数据批次列表（复用导入批次历史 GET /disclosure/import/history） */
export function getDataBatches(params: { pageNum: number; pageSize: number; templateId?: number }) {
  return request.get<never, ApiResult<PageResult<DataBatchOption>>>('/disclosure/import/history', { params })
}
