<template>
  <div class="engine-container">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2>合规检查引擎</h2>
        <p class="header-desc">选模板 + 数据批次 → 引擎按规则自动检查 → 算分定级 → 生成批次结果、机构明细与规则命中统计</p>
      </div>
      <el-button v-if="isSupervisor" type="primary" :icon="VideoPlay" @click="openStart()">发起检查</el-button>
    </div>

    <el-alert
      v-if="isInstitutionAdmin"
      class="role-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前为机构管理员，仅查看本机构的检查批次与合规结果" />

    <!-- 指标卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">总检查批次</div>
          <div class="stat-value">{{ overview.totalBatches ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本批次机构数</div>
          <div class="stat-value">{{ overview.institutionCount ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">合格率</div>
          <div class="stat-value stat-green">{{ overview.passRate ?? 0 }}%</div>
        </el-card>
      </el-col>
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">预警数</div>
          <div class="stat-value stat-yellow">{{ overview.warnCount ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">不合格数</div>
          <div class="stat-value stat-red">{{ overview.failCount ?? 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tabs -->
    <el-card shadow="never" class="tab-card">
      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <!-- Tab1 检查批次 -->
        <el-tab-pane label="检查批次" name="batch">
          <el-form :model="batchQuery" inline class="filter-form">
            <el-form-item label="批次号">
              <el-input v-model="batchQuery.batchNo" placeholder="请输入批次号" clearable style="width: 200px"
                        @keyup.enter="handleBatchQuery" />
            </el-form-item>
            <el-form-item label="模板名称">
              <el-input v-model="batchQuery.templateName" placeholder="请输入模板名称" clearable style="width: 180px"
                        @keyup.enter="handleBatchQuery" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="batchQuery.status" placeholder="全部" clearable style="width: 130px">
                <el-option label="进行中" :value="0" />
                <el-option label="完成" :value="1" />
                <el-option label="失败" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleBatchQuery">查询</el-button>
              <el-button :icon="Refresh" @click="resetBatchQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="batchLoading" :data="batchList" border stripe>
            <el-table-column prop="batchNo" label="批次号" min-width="180" show-overflow-tooltip />
            <el-table-column prop="templateName" label="模板" min-width="160" show-overflow-tooltip />
            <el-table-column label="触发方式" width="90" align="center">
              <template #default="scope">{{ scope.row.triggerType === 2 ? '定时' : '手动' }}</template>
            </el-table-column>
            <el-table-column label="范围" width="90" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.scope === 2 ? 'warning' : 'info'" size="small">
                  {{ scope.row.scope === 2 ? '本机构' : '全量' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="总数/通过/预警/失败" width="180" align="center">
              <template #default="scope">
                <span>{{ scope.row.totalCount }} / </span>
                <span class="text-green">{{ scope.row.passCount }} / </span>
                <span class="text-yellow">{{ scope.row.warnCount }} / </span>
                <span class="text-red">{{ scope.row.failCount }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="scope">
                <el-tag :type="batchStatusType(scope.row.status)" size="small">{{ batchStatusLabel(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="耗时(ms)" width="90" align="center">
              <template #default="scope">{{ scope.row.costTime ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="时间" width="170">
              <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="scope">
                <el-button link type="primary" @click="openDetail(scope.row)">查看明细</el-button>
                <el-button link type="success" @click="handleExport(scope.row)">导出</el-button>
                <el-button v-if="isSupervisor" link type="warning" @click="handleRecheck(scope.row)">重检</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="batchPageNum"
              v-model:page-size="batchPageSize"
              :total="batchTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="loadBatchList"
              @size-change="handleBatchSizeChange" />
          </div>
        </el-tab-pane>

        <!-- Tab2 机构合规明细 -->
        <el-tab-pane label="机构合规明细" name="detail">
          <el-alert v-if="!selectedBatch" type="info" :closable="false" show-icon title="请先在「检查批次」页选择一个批次查看明细" />
          <template v-else>
            <el-descriptions :column="4" border size="small" class="detail-desc">
              <el-descriptions-item label="批次号">{{ selectedBatch.batchNo }}</el-descriptions-item>
              <el-descriptions-item label="模板">{{ selectedBatch.templateName }}</el-descriptions-item>
              <el-descriptions-item label="机构总数">{{ selectedBatch.totalCount }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="batchStatusType(selectedBatch.status)" size="small">{{ batchStatusLabel(selectedBatch.status) }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>

            <el-table v-loading="resultLoading" :data="resultList" border stripe class="result-table">
              <el-table-column prop="orgName" label="机构名" min-width="180" show-overflow-tooltip />
              <el-table-column prop="templateName" label="模板" min-width="160" show-overflow-tooltip />
              <el-table-column prop="batchNo" label="批次" min-width="180" show-overflow-tooltip>
                <template #default="scope">{{ selectedBatch?.batchNo }}</template>
              </el-table-column>
              <el-table-column label="合规分" width="100" align="center">
                <template #default="scope">
                  <span class="score" :class="resultScoreClass(scope.row.status)">{{ scope.row.score }}</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="scope">
                  <el-tag :type="resultStatusType(scope.row.status)" size="small">{{ resultStatusLabel(scope.row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="issueCount" label="问题数" width="90" align="center" />
              <el-table-column label="时间" width="170">
                <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="openIssues(scope.row)">查看问题项</el-button>
                  <el-button link type="success" @click="handleExportOrg(scope.row)">导出</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-wrap">
              <el-pagination
                v-model:current-page="resultPageNum"
                v-model:page-size="resultPageSize"
                :total="resultTotal"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                @current-change="loadResultList"
                @size-change="handleResultSizeChange" />
            </div>
          </template>
        </el-tab-pane>

        <!-- Tab3 规则命中分析（监管员） -->
        <el-tab-pane v-if="isSupervisor" label="规则命中分析" name="hit">
          <el-table v-loading="hitLoading" :data="hitStats" border stripe>
            <el-table-column prop="ruleName" label="规则名" min-width="200" show-overflow-tooltip />
            <el-table-column prop="templateName" label="模板" min-width="160" show-overflow-tooltip />
            <el-table-column prop="hitCount" label="命中机构数" width="110" align="center" />
            <el-table-column label="命中率" width="180">
              <template #default="scope">
                <el-progress :percentage="scope.row.hitRate" :stroke-width="10" :color="progressColor(scope.row.hitRate)" />
              </template>
            </el-table-column>
            <el-table-column prop="avgDeduct" label="平均扣分" width="100" align="center" />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="scope">
                <el-button link type="primary" @click="openHitOrgs(scope.row)">查看命中机构</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!hitLoading && !hitStats.length" description="当前批次暂无规则命中数据" :image-size="60" />
        </el-tab-pane>

        <!-- Tab4 检查日志（监管员） -->
        <el-tab-pane v-if="isSupervisor" label="检查日志" name="log">
          <el-form :model="logQuery" inline class="filter-form">
            <el-form-item label="批次">
              <el-select v-model="logQuery.batchId" placeholder="全部批次" clearable filterable style="width: 240px">
                <el-option v-for="b in batchList" :key="b.id" :label="b.batchNo" :value="b.id" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleLogQuery">查询</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="logLoading" :data="logList" border stripe>
            <el-table-column prop="batchNo" label="批次号" min-width="180" show-overflow-tooltip />
            <el-table-column label="级别" width="90" align="center">
              <template #default="scope">
                <el-tag :type="logLevelType(scope.row.level)" size="small">{{ scope.row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="日志内容" min-width="320" show-overflow-tooltip />
            <el-table-column prop="costTime" label="耗时(ms)" width="100" align="center">
              <template #default="scope">{{ scope.row.costTime ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="时间" width="170">
              <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="logPageNum"
              v-model:page-size="logPageSize"
              :total="logTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="loadLogList"
              @size-change="handleLogSizeChange" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 发起检查弹窗 -->
    <el-dialog v-model="startVisible" title="发起合规检查" width="640px" destroy-on-close>
      <el-form :model="startForm" label-width="110px">
        <el-form-item label="选择模板" required>
          <el-select v-model="startForm.templateId" placeholder="请选择模板" filterable style="width: 100%">
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="披露数据批次">
          <el-select v-model="startForm.dataBatchId" placeholder="不选则检查最新数据" clearable filterable style="width: 100%">
            <el-option v-for="b in dataBatches" :key="b.id" :label="`${b.batchNo}（${b.templateName}）`" :value="b.id" />
          </el-select>
          <div class="form-tip">留空表示使用各机构最新披露数据（disclosure_data）</div>
        </el-form-item>
        <el-form-item label="检查范围" required>
          <el-radio-group v-model="startForm.scope">
            <el-radio label="ALL">全量</el-radio>
            <el-radio label="ORG">本机构</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="startForm.scope === 'ORG'" label="指定机构" required>
          <el-select v-model="startForm.orgId" placeholder="请选择机构" filterable style="width: 100%">
            <el-option v-for="o in institutions" :key="o.id" :label="`${o.orgName}（ID:${o.id}）`" :value="o.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="startVisible = false">取消</el-button>
        <el-button type="primary" :loading="startLoading" @click="runStart">确认发起</el-button>
      </template>
    </el-dialog>

    <!-- 问题项抽屉 -->
    <el-drawer v-model="issueVisible" :title="`问题项：${currentResult?.orgName ?? ''}`" size="56%">
      <el-descriptions v-if="currentResult" :column="3" border size="small" class="drawer-desc">
        <el-descriptions-item label="机构">{{ currentResult.orgName }}</el-descriptions-item>
        <el-descriptions-item label="合规分">{{ currentResult.score }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="resultStatusType(currentResult.status)" size="small">{{ resultStatusLabel(currentResult.status) }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-table v-loading="issueLoading" :data="issues" border stripe size="small" class="drawer-table">
        <el-table-column prop="ruleName" label="规则名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="fieldName" label="字段" width="140" show-overflow-tooltip />
        <el-table-column prop="ruleDesc" label="规则描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="actualValue" label="实际值" width="120" show-overflow-tooltip>
          <template #default="scope"><span v-if="scope.row.actualValue">{{ scope.row.actualValue }}</span><span v-else class="text-muted">空</span></template>
        </el-table-column>
        <el-table-column prop="expectedValue" label="预期" width="120" show-overflow-tooltip />
        <el-table-column prop="deductScore" label="扣分" width="70" align="center" />
        <el-table-column prop="suggestion" label="整改建议" min-width="200" show-overflow-tooltip />
      </el-table>
      <el-empty v-if="!issueLoading && !issues.length" description="无问题项（全部合规）" :image-size="60" />
    </el-drawer>

    <!-- 命中机构弹窗 -->
    <el-dialog v-model="hitOrgsVisible" :title="`命中机构：${currentHit?.ruleName ?? ''}`" width="480px">
      <el-table :data="hitOrgRows" border stripe size="small" max-height="320">
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="name" label="机构名称" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search, VideoPlay } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getBatchDetail,
  getBatchList,
  getDataBatches,
  getLogList,
  getOverview,
  getResultIssues,
  getRuleHitStats,
  startCheck,
  type CheckBatch,
  type CheckIssue,
  type CheckLog,
  type CheckOverview,
  type CheckResult,
  type DataBatchOption,
  type RuleHitStat,
} from '@/api/engine'
import { getTemplatePage, type TemplateItem } from '@/api/superviseTemplate'
import { getInstitutions, type InstitutionOption } from '@/api/checkScore'

const userStore = useUserStore()

// ============ 权限 ============
const isSupervisor = computed(() => userStore.role === 'supervisor')
const isInstitutionAdmin = computed(() => userStore.role === 'orgAdmin')

// ============ 指标卡片 ============
const overview = ref<CheckOverview>({
  totalBatches: 0, latestBatchId: null, latestBatchNo: null,
  institutionCount: 0, passCount: 0, warnCount: 0, failCount: 0, passRate: 0,
})

async function loadOverview() {
  try {
    const res = await getOverview()
    overview.value = res.data
  } catch (e) {
    ElMessage.error((e as Error).message || '加载指标失败')
  }
}

// ============ Tab1 检查批次 ============
const activeTab = ref('batch')
const batchLoading = ref(false)
const batchList = ref<CheckBatch[]>([])
const batchTotal = ref(0)
const batchPageNum = ref(1)
const batchPageSize = ref(10)
const batchQuery = reactive({ batchNo: '', templateName: '', status: undefined as number | undefined })

async function loadBatchList() {
  batchLoading.value = true
  try {
    const res = await getBatchList({
      pageNum: batchPageNum.value,
      pageSize: batchPageSize.value,
      batchNo: batchQuery.batchNo || undefined,
      templateName: batchQuery.templateName || undefined,
      status: batchQuery.status,
    })
    batchList.value = res.data.list
    batchTotal.value = res.data.total
    // 默认选中最新批次
    const first = batchList.value[0]
    if (!selectedBatch.value && first) {
      openDetail(first)
    }
  } catch (e) {
    ElMessage.error((e as Error).message || '加载批次失败')
  } finally {
    batchLoading.value = false
  }
}

function handleBatchQuery() { batchPageNum.value = 1; loadBatchList() }
function handleBatchSizeChange() { batchPageNum.value = 1; loadBatchList() }
function resetBatchQuery() {
  batchQuery.batchNo = ''
  batchQuery.templateName = ''
  batchQuery.status = undefined
  handleBatchQuery()
}

// ============ Tab2 机构合规明细 ============
const selectedBatch = ref<CheckBatch | null>(null)
const resultLoading = ref(false)
const resultList = ref<CheckResult[]>([])
const resultTotal = ref(0)
const resultPageNum = ref(1)
const resultPageSize = ref(10)

function openDetail(row: CheckBatch) {
  selectedBatch.value = row
  resultPageNum.value = 1
  activeTab.value = 'detail'
  loadResultList()
}

async function loadResultList() {
  if (!selectedBatch.value) return
  resultLoading.value = true
  try {
    const res = await getBatchDetail(selectedBatch.value.id, resultPageNum.value, resultPageSize.value)
    selectedBatch.value = res.data.batch
    resultList.value = res.data.results.list
    resultTotal.value = res.data.results.total
  } catch (e) {
    ElMessage.error((e as Error).message || '加载明细失败')
  } finally {
    resultLoading.value = false
  }
}

function handleResultSizeChange() { resultPageNum.value = 1; loadResultList() }

// ============ 问题项抽屉 ============
const issueVisible = ref(false)
const issueLoading = ref(false)
const issues = ref<CheckIssue[]>([])
const currentResult = ref<CheckResult | null>(null)

async function openIssues(row: CheckResult) {
  currentResult.value = row
  issueVisible.value = true
  issueLoading.value = true
  issues.value = []
  try {
    const res = await getResultIssues(row.id)
    issues.value = res.data
  } catch (e) {
    ElMessage.error((e as Error).message || '加载问题项失败')
  } finally {
    issueLoading.value = false
  }
}

// ============ Tab3 规则命中分析 ============
const hitLoading = ref(false)
const hitStats = ref<RuleHitStat[]>([])
const hitOrgsVisible = ref(false)
const currentHit = ref<RuleHitStat | null>(null)
const hitOrgRows = ref<{ name: string }[]>([])

async function loadHitStats() {
  if (!isSupervisor.value || !selectedBatch.value) return
  hitLoading.value = true
  try {
    const res = await getRuleHitStats(selectedBatch.value.id, 10)
    hitStats.value = res.data
  } catch (e) {
    ElMessage.error((e as Error).message || '加载规则命中分析失败')
  } finally {
    hitLoading.value = false
  }
}

function openHitOrgs(row: RuleHitStat) {
  currentHit.value = row
  hitOrgRows.value = (row.hitOrgs ?? []).map((name) => ({ name }))
  hitOrgsVisible.value = true
}

// ============ Tab4 检查日志 ============
const logLoading = ref(false)
const logList = ref<CheckLog[]>([])
const logTotal = ref(0)
const logPageNum = ref(1)
const logPageSize = ref(10)
const logQuery = reactive({ batchId: undefined as number | undefined })

async function loadLogList() {
  if (!isSupervisor.value) return
  logLoading.value = true
  try {
    const res = await getLogList({ batchId: logQuery.batchId, pageNum: logPageNum.value, pageSize: logPageSize.value })
    logList.value = res.data.list
    logTotal.value = res.data.total
  } catch (e) {
    ElMessage.error((e as Error).message || '加载日志失败')
  } finally {
    logLoading.value = false
  }
}

function handleLogQuery() { logPageNum.value = 1; loadLogList() }
function handleLogSizeChange() { logPageNum.value = 1; loadLogList() }

// ============ 发起检查 ============
const startVisible = ref(false)
const startLoading = ref(false)
const templates = ref<TemplateItem[]>([])
const dataBatches = ref<DataBatchOption[]>([])
const institutions = ref<InstitutionOption[]>([])
const startForm = reactive({
  templateId: undefined as number | undefined,
  dataBatchId: undefined as number | undefined,
  scope: 'ALL' as 'ALL' | 'ORG',
  orgId: undefined as number | undefined,
})

async function openStart(row?: CheckBatch) {
  startVisible.value = true
  startForm.templateId = row?.templateId
  startForm.dataBatchId = undefined
  startForm.scope = 'ALL'
  startForm.orgId = undefined
  try {
    const [tRes, bRes, iRes] = await Promise.all([
      getTemplatePage({ pageNum: 1, pageSize: 200 }),
      getDataBatches({ pageNum: 1, pageSize: 200 }),
      getInstitutions(),
    ])
    templates.value = tRes.data.list.filter((t: TemplateItem) => t.status === 1)
    dataBatches.value = bRes.data.list ?? []
    // 排除监管总局(id=1)
    institutions.value = iRes.data.filter((o: InstitutionOption) => o.id !== 1)
  } catch (e) {
    ElMessage.error((e as Error).message || '加载发起检查数据源失败')
  }
}

async function runStart() {
  if (!startForm.templateId) {
    ElMessage.warning('请选择模板')
    return
  }
  if (startForm.scope === 'ORG' && !startForm.orgId) {
    ElMessage.warning('本机构范围需指定机构')
    return
  }
  startLoading.value = true
  try {
    const res = await startCheck({
      templateId: startForm.templateId,
      dataBatchId: startForm.dataBatchId ?? null,
      scope: startForm.scope,
      orgId: startForm.scope === 'ORG' ? startForm.orgId ?? null : null,
    })
    ElMessage.success(`检查完成，批次号：${res.data.batchNo}（合格${res.data.passCount}/预警${res.data.warnCount}/不合格${res.data.failCount}）`)
    startVisible.value = false
    batchPageNum.value = 1
    await Promise.all([loadOverview(), loadBatchList()])
  } catch (e) {
    ElMessage.error((e as Error).message || '发起检查失败')
  } finally {
    startLoading.value = false
  }
}

// ============ 操作（演示） ============
function handleExport(row: CheckBatch) {
  ElMessage.info(`演示：导出批次 ${row.batchNo} 检查报告`)
}
function handleRecheck(row: CheckBatch) {
  openStart(row)
}
function handleExportOrg(row: CheckResult) {
  ElMessage.info(`演示：导出机构 ${row.orgName} 合规明细`)
}

// ============ Tab 切换 ============
function onTabChange(name: string | number) {
  if (name === 'hit') loadHitStats()
  if (name === 'log') loadLogList()
}

// ============ 工具函数 ============
function formatTime(t?: string) {
  return t ? t.replace('T', ' ') : ''
}
function batchStatusLabel(s: number) {
  return s === 1 ? '完成' : s === 0 ? '进行中' : '失败'
}
function batchStatusType(s: number): 'success' | 'danger' | 'info' {
  return s === 1 ? 'success' : s === 0 ? 'info' : 'danger'
}
function resultStatusLabel(s: number) {
  return s === 1 ? '合格' : s === 2 ? '预警' : '不合格'
}
function resultStatusType(s: number): 'success' | 'warning' | 'danger' {
  return s === 1 ? 'success' : s === 2 ? 'warning' : 'danger'
}
function resultScoreClass(s: number) {
  return s === 1 ? 'score-pass' : s === 2 ? 'score-warn' : 'score-fail'
}
function progressColor(p: number) {
  return p >= 80 ? '#67C23A' : p >= 40 ? '#E6A23C' : '#F56C6C'
}
function logLevelType(level: string): 'success' | 'warning' | 'danger' | 'info' {
  if (level === 'ERROR') return 'danger'
  if (level === 'WARN') return 'warning'
  return 'info'
}

onMounted(() => {
  loadOverview()
  loadBatchList()
})
</script>

<style scoped>
.engine-container {
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
.role-alert {
  margin-bottom: 16px;
  border-radius: 8px;
}
.stat-row {
  margin-bottom: 16px;
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
  font-size: 26px;
  font-weight: 700;
  color: #303133;
}
.stat-green { color: #67c23a; }
.stat-yellow { color: #e6a23c; }
.stat-red { color: #f56c6c; }
.tab-card {
  border-radius: 8px;
}
.filter-form {
  margin-bottom: 4px;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.detail-desc {
  margin-bottom: 16px;
}
.result-table {
  margin-top: 8px;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.drawer-desc {
  margin-bottom: 16px;
}
.drawer-table {
  margin-top: 8px;
}
.score {
  font-size: 18px;
  font-weight: 700;
}
.score-pass { color: #67c23a; }
.score-warn { color: #e6a23c; }
.score-fail { color: #f56c6c; }
.text-green { color: #67c23a; }
.text-yellow { color: #e6a23c; }
.text-red { color: #f56c6c; }
.text-muted { color: #c0c4cc; }
</style>
