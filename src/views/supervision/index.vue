<template>
  <div class="supervisor-container">
    <!-- 权限拦截：机构管理员/游客 无权限 -->
    <el-result v-if="!isSupervisor" icon="warning" title="403" sub-title="无权限访问，监管视图仅监管员可见">
      <template #extra>
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </template>
    </el-result>

    <template v-else>
      <!-- 顶部标题栏 -->
      <div class="page-header">
        <div class="header-left">
          <h2>监管视图</h2>
          <p class="header-desc">辖区合规全景大屏：指标 + 图表 + 排行，数据聚合自机构 / 披露 / 检查引擎</p>
        </div>
        <span v-if="overview.latestBatchTime" class="latest-batch">最新批次：{{ overview.latestBatchNo }}（{{ formatTime(overview.latestBatchTime) }}）</span>
      </div>

      <!-- 过滤区 -->
      <el-card shadow="never" class="filter-card">
        <el-form :model="queryForm" inline>
          <el-form-item label="检查批次">
            <el-select v-model="queryForm.batchId" placeholder="默认最新批次" clearable filterable style="width: 220px">
              <el-option v-for="b in batches" :key="b.id" :label="b.batchNo" :value="b.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="模板">
            <el-select v-model="queryForm.templateId" placeholder="全部模板" clearable filterable style="width: 180px">
              <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="queryForm.timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 340px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
            <el-button :icon="Refresh" @click="loadAll">刷新</el-button>
            <el-button :icon="Download" @click="handleExport">导出全景报告</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 指标卡片 -->
      <el-row :gutter="16" class="stat-row">
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">机构总数</div>
            <div class="stat-value">{{ overview.totalOrgCount }}</div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">已披露数</div>
            <div class="stat-value">{{ overview.disclosedCount }}<span class="stat-sub">（{{ overview.discloseRate }}%）</span></div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">合格率</div>
            <div class="stat-value stat-green">{{ overview.passRate }}%</div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">预警率</div>
            <div class="stat-value stat-yellow">{{ overview.warnRate }}%</div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">不合格率</div>
            <div class="stat-value stat-red">{{ overview.failRate }}%</div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">平均合规分</div>
            <div class="stat-value">{{ overview.avgScore }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表区 -->
      <el-row :gutter="16" class="chart-row">
        <el-col :span="12">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="chart-title">合规状态分布</span></template>
            <div ref="pieEl" class="chart-box"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="chart-title">高频违规规则 Top10</span></template>
            <div ref="barEl" class="chart-box"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="chart-row">
        <el-col :span="24">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="chart-title">近批次平均合规分趋势</span></template>
            <div ref="trendEl" class="chart-box chart-box--short"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Tabs -->
      <el-card shadow="never" class="tab-card">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="机构合规排行" name="rank">
            <el-table v-loading="rankLoading" :data="rankList" border stripe>
              <el-table-column prop="rank" label="排名" width="70" align="center" />
              <el-table-column prop="orgName" label="机构名" min-width="160" show-overflow-tooltip />
              <el-table-column prop="region" label="区域" min-width="140" show-overflow-tooltip />
              <el-table-column prop="orgType" label="类型" width="130" align="center" />
              <el-table-column prop="batchNo" label="批次" min-width="180" show-overflow-tooltip />
              <el-table-column label="合规分" width="100" align="center">
                <template #default="scope">
                  <span class="score" :class="scoreClass(scope.row.status)">{{ scope.row.score }}</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="scope">
                  <el-tag :type="statusType(scope.row.status)" size="small">{{ statusLabel(scope.row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="issueCount" label="问题数" width="80" align="center" />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="goResult(scope.row)">查看结果</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="pagination-wrap">
              <el-pagination
                v-model:current-page="rankPageNum"
                v-model:page-size="rankPageSize"
                :total="rankTotal"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                @current-change="loadRank"
                @size-change="handleRankSize" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="高频问题规则" name="rule">
            <el-table v-loading="ruleLoading" :data="ruleList" border stripe>
              <el-table-column prop="ruleName" label="规则名" min-width="200" show-overflow-tooltip />
              <el-table-column prop="templateName" label="模板" min-width="160" show-overflow-tooltip />
              <el-table-column prop="hitCount" label="命中机构数" width="110" align="center" />
              <el-table-column label="命中率" width="180">
                <template #default="scope">
                  <el-progress :percentage="scope.row.hitRate" :stroke-width="10" :color="progressColor(scope.row.hitRate)" />
                </template>
              </el-table-column>
              <el-table-column prop="avgDeduct" label="平均扣分" width="100" align="center" />
            </el-table>
            <el-empty v-if="!ruleLoading && !ruleList.length" description="暂无规则命中数据" :image-size="60" />
          </el-tab-pane>

          <el-tab-pane label="未披露 / 异常机构" name="not">
            <el-table v-loading="notLoading" :data="notList" border stripe>
              <el-table-column prop="orgName" label="机构名" min-width="160" show-overflow-tooltip />
              <el-table-column prop="creditCode" label="统一社会信用代码" min-width="200" show-overflow-tooltip />
              <el-table-column label="最后披露时间" width="170">
                <template #default="scope">{{ formatTime(scope.row.lastDiscloseTime) || '从未披露' }}</template>
              </el-table-column>
              <el-table-column label="状态" width="120" align="center">
                <template #default="scope">
                  <el-tag :type="notStatusType(scope.row.status)" size="small">{{ scope.row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button link type="warning" @click="goOrg(scope.row)">督办</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="pagination-wrap">
              <el-pagination
                v-model:current-page="notPageNum"
                v-model:page-size="notPageSize"
                :total="notTotal"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                @current-change="loadNotDisclosed"
                @size-change="handleNotSize" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Refresh, Search } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useUserStore } from '@/stores/user'
import {
  getNotDisclosed,
  getOrgRank,
  getRuleHitRank,
  getSupervisorOverview,
  type NotDisclosed,
  type OrgRank,
  type RuleHitRank,
  type SupervisorOverview,
} from '@/api/supervisor'
import { getBatchList, type CheckBatch } from '@/api/engine'
import { getTemplatePage, type TemplateItem } from '@/api/superviseTemplate'

const router = useRouter()
const userStore = useUserStore()
const isSupervisor = computed(() => userStore.role === 'supervisor')

type EChartsInstance = ReturnType<typeof echarts.init>

// ============ 静态占位示例（接口异常时兜底） ============
const STATIC_OVERVIEW: SupervisorOverview = {
  totalOrgCount: 8, disclosedCount: 7, discloseRate: 88,
  passCount: 5, warnCount: 2, failCount: 1,
  passRate: 63, warnRate: 25, failRate: 12, avgScore: 86.5,
  latestBatchId: 1, latestBatchNo: 'ENG20261120090000101', latestBatchTime: '2026-11-20 09:00:02',
  statusDistribution: [
    { name: '合格', value: 5 },
    { name: '预警', value: 2 },
    { name: '不合格', value: 1 },
  ],
  trend: [
    { date: '11-14', avgScore: 88 }, { date: '11-15', avgScore: 90 },
    { date: '11-16', avgScore: 85 }, { date: '11-17', avgScore: 87 },
    { date: '11-18', avgScore: 84 }, { date: '11-19', avgScore: 86 },
    { date: '11-20', avgScore: 86.5 },
  ],
}
const STATIC_RANK: OrgRank[] = [
  { rank: 1, orgId: 2, orgName: '示例机构A', region: '上海市浦东新区', orgType: '互联网金融机构', batchNo: 'ENG20261120090000101', score: 100, status: 1, issueCount: 0, resultId: 1 },
  { rank: 2, orgId: 5, orgName: '示例机构D', region: '北京市朝阳区', orgType: '互联网金融机构', batchNo: 'ENG20261120090000101', score: 95, status: 1, issueCount: 1, resultId: 4 },
  { rank: 3, orgId: 6, orgName: '示例机构E', region: '广州市天河区', orgType: '互联网金融机构', batchNo: 'ENG20261120090000101', score: 91, status: 1, issueCount: 1, resultId: 5 },
  { rank: 4, orgId: 3, orgName: '示例机构B', region: '深圳市南山区', orgType: '互联网金融机构', batchNo: 'ENG20261120090000101', score: 77, status: 2, issueCount: 2, resultId: 2 },
  { rank: 5, orgId: 7, orgName: '示例机构F', region: '杭州市滨江区', orgType: '互联网金融机构', batchNo: 'ENG20261120090000101', score: 72, status: 2, issueCount: 2, resultId: 6 },
  { rank: 6, orgId: 4, orgName: '示例机构C', region: '杭州市滨江区', orgType: '互联网金融机构', batchNo: 'ENG20261120090000101', score: 62, status: 3, issueCount: 3, resultId: 3 },
]
const STATIC_RULES: RuleHitRank[] = [
  { ruleId: 3, ruleName: 'disclose_date必填校验', fieldName: 'disclose_date', templateName: '月度经营数据披露模板', hitCount: 2, totalCount: 3, hitRate: 67, avgDeduct: 15, hitOrgs: ['示例机构B', '示例机构C'] },
  { ruleId: 1, ruleName: 'paid_capital必填校验', fieldName: 'paid_capital', templateName: '月度经营数据披露模板', hitCount: 1, totalCount: 3, hitRate: 33, avgDeduct: 15, hitOrgs: ['示例机构C'] },
  { ruleId: 2, ruleName: 'expected_yield格式校验', fieldName: 'expected_yield', templateName: '月度经营数据披露模板', hitCount: 1, totalCount: 3, hitRate: 33, avgDeduct: 8, hitOrgs: ['示例机构C'] },
  { ruleId: 4, ruleName: 'contact_phone格式校验', fieldName: 'contact_phone', templateName: '月度经营数据披露模板', hitCount: 1, totalCount: 3, hitRate: 33, avgDeduct: 8, hitOrgs: ['示例机构B'] },
  { ruleId: 6, ruleName: 'audit_date必填校验', fieldName: 'audit_date', templateName: '年度审计报告披露模板', hitCount: 1, totalCount: 3, hitRate: 33, avgDeduct: 15, hitOrgs: ['示例机构F'] },
]
const STATIC_NOT: NotDisclosed[] = [
  { orgId: 8, orgName: '示例机构G', creditCode: 'ABCD00000000000008', status: '未披露', lastDiscloseTime: null },
  { orgId: 4, orgName: '示例机构C', creditCode: 'ABCD00000000000004', status: '异常(不合格)', lastDiscloseTime: '2026-11-10 09:05:03' },
  { orgId: 3, orgName: '示例机构B', creditCode: 'ABCD00000000000003', status: '预警', lastDiscloseTime: '2026-11-10 09:05:02' },
]

// ============ 过滤 ============
const batches = ref<CheckBatch[]>([])
const templates = ref<TemplateItem[]>([])
const queryForm = reactive({
  batchId: undefined as number | undefined,
  templateId: undefined as number | undefined,
  timeRange: [] as string[],
})

async function loadOptions() {
  try {
    const [bRes, tRes] = await Promise.all([
      getBatchList({ pageNum: 1, pageSize: 200 }),
      getTemplatePage({ pageNum: 1, pageSize: 200 }),
    ])
    batches.value = bRes.data.list
    templates.value = tRes.data.list
  } catch (e) {
    ElMessage.error((e as Error).message || '加载筛选数据源失败')
  }
}

// ============ 概览 ============
const overview = ref<SupervisorOverview>(STATIC_OVERVIEW)

async function loadOverview() {
  try {
    const range = queryForm.timeRange ?? []
    const res = await getSupervisorOverview({
      batchId: queryForm.batchId,
      startTime: range[0] || undefined,
      endTime: range[1] || undefined,
    })
    overview.value = res.data
  } catch (e) {
    // 接口异常时使用静态占位
    overview.value = STATIC_OVERVIEW
  } finally {
    await nextTick()
    renderCharts()
  }
}

// ============ 机构排行 ============
const rankLoading = ref(false)
const rankList = ref<OrgRank[]>([])
const rankTotal = ref(0)
const rankPageNum = ref(1)
const rankPageSize = ref(10)

async function loadRank() {
  rankLoading.value = true
  try {
    const res = await getOrgRank({
      batchId: queryForm.batchId,
      templateId: queryForm.templateId,
      pageNum: rankPageNum.value,
      pageSize: rankPageSize.value,
    })
    rankList.value = res.data.list
    rankTotal.value = res.data.total
  } catch (e) {
    rankList.value = STATIC_RANK
    rankTotal.value = STATIC_RANK.length
  } finally {
    rankLoading.value = false
  }
}
function handleRankSize() { rankPageNum.value = 1; loadRank() }

// ============ 规则命中排行 ============
const ruleLoading = ref(false)
const ruleList = ref<RuleHitRank[]>([])

async function loadRuleRank() {
  ruleLoading.value = true
  try {
    const res = await getRuleHitRank({ batchId: queryForm.batchId, topN: 10 })
    ruleList.value = res.data
  } catch (e) {
    ruleList.value = STATIC_RULES
  } finally {
    ruleLoading.value = false
    await nextTick()
    renderCharts()
  }
}

// ============ 未披露/异常 ============
const notLoading = ref(false)
const notList = ref<NotDisclosed[]>([])
const notTotal = ref(0)
const notPageNum = ref(1)
const notPageSize = ref(10)

async function loadNotDisclosed() {
  notLoading.value = true
  try {
    const res = await getNotDisclosed({
      batchId: queryForm.batchId,
      pageNum: notPageNum.value,
      pageSize: notPageSize.value,
    })
    notList.value = res.data.list
    notTotal.value = res.data.total
  } catch (e) {
    notList.value = STATIC_NOT
    notTotal.value = STATIC_NOT.length
  } finally {
    notLoading.value = false
  }
}
function handleNotSize() { notPageNum.value = 1; loadNotDisclosed() }

// ============ 图表 ============
const pieEl = ref<HTMLElement | null>(null)
const barEl = ref<HTMLElement | null>(null)
const trendEl = ref<HTMLElement | null>(null)
const pieChart = shallowRef<EChartsInstance | null>(null)
const barChart = shallowRef<EChartsInstance | null>(null)
const trendChart = shallowRef<EChartsInstance | null>(null)

function statusColor(name: string) {
  if (name.includes('合格')) return '#67C23A'
  if (name.includes('预警')) return '#E6A23C'
  return '#F56C6C'
}

function renderCharts() {
  if (!isSupervisor.value) return
  // 饼图
  if (pieEl.value) {
    if (!pieChart.value) pieChart.value = echarts.init(pieEl.value)
    pieChart.value.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        label: { formatter: '{b}: {c}' },
        data: (overview.value.statusDistribution ?? []).map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: statusColor(d.name) },
        })),
      }],
    })
  }
  // 柱状图
  if (barEl.value) {
    if (!barChart.value) barChart.value = echarts.init(barEl.value)
    barChart.value.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 80, containLabel: true },
      xAxis: {
        type: 'category',
        data: ruleList.value.map((r) => r.ruleName),
        axisLabel: { rotate: 30, interval: 0 },
      },
      yAxis: { type: 'value', name: '命中机构数', minInterval: 1 },
      series: [{ type: 'bar', data: ruleList.value.map((r) => r.hitCount), barMaxWidth: 32, itemStyle: { color: '#409EFF' } }],
    })
  }
  // 趋势折线
  if (trendEl.value) {
    if (!trendChart.value) trendChart.value = echarts.init(trendEl.value)
    trendChart.value.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30, containLabel: true },
      xAxis: { type: 'category', data: (overview.value.trend ?? []).map((t) => t.date), boundaryGap: false },
      yAxis: { type: 'value', name: '平均分', min: 0, max: 100 },
      series: [{
        type: 'line',
        smooth: true,
        data: (overview.value.trend ?? []).map((t) => t.avgScore),
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#67C23A' },
      }],
    })
  }
}

function handleResize() {
  pieChart.value?.resize()
  barChart.value?.resize()
  trendChart.value?.resize()
}

// ============ 交互 ============
const activeTab = ref('rank')

function handleQuery() {
  rankPageNum.value = 1
  notPageNum.value = 1
  loadAll()
}

function loadAll() {
  loadOverview()
  loadRank()
  loadRuleRank()
  loadNotDisclosed()
}

function handleExport() {
  ElMessage.info('演示：导出全景报告')
}

function goResult(row: OrgRank) {
  router.push('/result')
}
function goOrg(row: NotDisclosed) {
  router.push('/org')
}

// ============ 工具函数 ============
function formatTime(t?: string | null) {
  return t ? t.replace('T', ' ') : ''
}
function statusLabel(s: number) {
  return s === 1 ? '合格' : s === 2 ? '预警' : '不合格'
}
function statusType(s: number): 'success' | 'warning' | 'danger' {
  return s === 1 ? 'success' : s === 2 ? 'warning' : 'danger'
}
function scoreClass(s: number) {
  return s === 1 ? 'score-pass' : s === 2 ? 'score-warn' : 'score-fail'
}
function progressColor(p: number) {
  return p >= 80 ? '#67C23A' : p >= 40 ? '#E6A23C' : '#F56C6C'
}
function notStatusType(s: string): 'success' | 'warning' | 'danger' | 'info' {
  if (s === '未披露') return 'info'
  if (s === '异常(不合格)') return 'danger'
  return 'warning'
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  if (isSupervisor.value) {
    loadOptions()
    loadAll()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  pieChart.value?.dispose()
  barChart.value?.dispose()
  trendChart.value?.dispose()
})
</script>

<style scoped>
.supervisor-container {
  padding: 16px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}
.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
}
.header-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}
.latest-batch {
  font-size: 13px;
  color: #409eff;
  margin-top: 4px;
}
.filter-card,
.tab-card {
  border-radius: 8px;
}
.tab-card {
  margin-top: 16px;
}
.stat-row {
  margin-top: 16px;
}
.stat-card {
  text-align: center;
  border-radius: 8px;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}
.stat-sub {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
}
.stat-green { color: #67c23a; }
.stat-yellow { color: #e6a23c; }
.stat-red { color: #f56c6c; }
.chart-row {
  margin-top: 16px;
}
.chart-card {
  border-radius: 8px;
}
.chart-title {
  font-weight: 600;
  color: #303133;
}
.chart-box {
  height: 300px;
  width: 100%;
}
.chart-box--short {
  height: 220px;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.score {
  font-size: 18px;
  font-weight: 700;
}
.score-pass { color: #67c23a; }
.score-warn { color: #e6a23c; }
.score-fail { color: #f56c6c; }
</style>
