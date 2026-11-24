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

/** 名称-数值（饼图/柱状图） */
export interface NameValue {
  name: string
  value: number
}

/** 趋势点 */
export interface TrendPoint {
  date: string
  avgScore: number
}

/** 全景概览 */
export interface SupervisorOverview {
  totalOrgCount: number
  disclosedCount: number
  discloseRate: number
  passCount: number
  warnCount: number
  failCount: number
  passRate: number
  warnRate: number
  failRate: number
  avgScore: number
  latestBatchId: number | null
  latestBatchNo: string | null
  latestBatchTime: string | null
  statusDistribution: NameValue[]
  trend: TrendPoint[]
}

/** 机构合规排行项 */
export interface OrgRank {
  rank: number
  orgId: number
  orgName: string
  region: string
  orgType: string
  batchNo: string
  score: number
  status: number // 1合格 2预警 3不合格
  issueCount: number
  resultId: number
}

/** 规则命中排行项 */
export interface RuleHitRank {
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

/** 未披露/异常机构项 */
export interface NotDisclosed {
  orgId: number
  orgName: string
  creditCode: string
  status: string
  lastDiscloseTime: string | null
}

// ============ 接口 ============

/** 全景概览 GET /supervisor/overview */
export function getSupervisorOverview(params: { batchId?: number; startTime?: string; endTime?: string }) {
  return request.get<never, ApiResult<SupervisorOverview>>('/supervisor/overview', { params })
}

/** 机构合规排行 GET /supervisor/org/rank */
export function getOrgRank(params: { batchId?: number; templateId?: number; pageNum: number; pageSize: number }) {
  return request.get<never, ApiResult<PageResult<OrgRank>>>('/supervisor/org/rank', { params })
}

/** 规则命中排行 GET /supervisor/rule/hit-rank */
export function getRuleHitRank(params: { batchId?: number; topN?: number }) {
  return request.get<never, ApiResult<RuleHitRank[]>>('/supervisor/rule/hit-rank', { params })
}

/** 未披露/异常机构 GET /supervisor/org/not-disclosed */
export function getNotDisclosed(params: { batchId?: number; pageNum: number; pageSize: number }) {
  return request.get<never, ApiResult<PageResult<NotDisclosed>>>('/supervisor/org/not-disclosed', { params })
}
