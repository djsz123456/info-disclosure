<template>
  <div class="report-container">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2>合规结果输出</h2>
        <p class="header-desc">基于合规检查引擎结果，做报告查询 / 概览 / 预览 / 导出（不重复执行检查）</p>
      </div>
    </div>

    <el-alert
      v-if="isInstitutionAdmin"
      class="role-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前为机构管理员，仅查看本机构合规结果与报告" />

    <!-- 过滤区 -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="queryForm" inline>
        <el-form-item label="批次号">
          <el-select v-model="queryForm.batchId" placeholder="全部批次" clearable filterable style="width: 200px">
            <el-option v-for="b in batches" :key="b.id" :label="b.batchNo" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isSupervisor" label="机构名称">
          <el-select v-model="queryForm.orgName" placeholder="全部机构" clearable filterable style="width: 180px">
            <el-option v-for="o in institutions" :key="o.id" :label="o.orgName" :value="o.orgName" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板">
          <el-select v-model="queryForm.templateId" placeholder="全部模板" clearable filterable style="width: 180px">
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="合规状态">
          <el-select v-model="queryForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="合格" :value="1" />
            <el-option label="预警" :value="2" />
            <el-option label="不合格" :value="3" />
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
            style="width: 360px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
          <el-button v-if="isSupervisor" type="success" :icon="Download" @click="exportSummary">导出汇总</el-button>
          <el-button v-if="isInstitutionAdmin" type="success" :icon="Download" @click="exportSelf">导出单机构</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 指标卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">总机构数</div>
          <div class="stat-value">{{ metrics.totalCount ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">合格率</div>
          <div class="stat-value stat-green">{{ metrics.passRate ?? 0 }}%</div>
        </el-card>
      </el-col>
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">预警率</div>
          <div class="stat-value stat-yellow">{{ metrics.warnRate ?? 0 }}%</div>
        </el-card>
      </el-col>
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">不合格率</div>
          <div class="stat-value stat-red">{{ metrics.failRate ?? 0 }}%</div>
        </el-card>
      </el-col>
      <el-col :span="4.8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">平均分</div>
          <div class="stat-value">{{ metrics.avgScore ?? 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 核心表格 -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="batchNo" label="批次号" min-width="180" show-overflow-tooltip />
        <el-table-column prop="orgName" label="机构名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="templateName" label="模板" min-width="160" show-overflow-tooltip />
        <el-table-column label="检查时间" width="170">
          <template #default="scope">{{ formatTime(scope.row.checkTime) }}</template>
        </el-table-column>
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
        <el-table-column prop="issueCount" label="问题数" width="90" align="center" />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openPreview(scope.row)">查看报告</el-button>
            <el-button link type="success" @click="exportSingle(scope.row)">导出</el-button>
            <el-button link type="warning" @click="openIssues(scope.row)">查看问题项</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadData"
          @size-change="handleSizeChange" />
      </div>
    </el-card>

    <!-- 报告预览抽屉 -->
    <el-drawer v-model="previewVisible" :title="`合规报告：${preview?.orgName ?? ''}`" size="62%">
      <template v-if="preview">
        <el-descriptions :column="3" border size="small" class="preview-desc">
          <el-descriptions-item label="机构名称">{{ preview.orgName }}</el-descriptions-item>
          <el-descriptions-item label="统一社会信用代码">{{ preview.creditCode }}</el-descriptions-item>
          <el-descriptions-item label="模板">{{ preview.templateName }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ preview.batchNo }}</el-descriptions-item>
          <el-descriptions-item label="检查时间">{{ formatTime(preview.checkTime) }}</el-descriptions-item>
          <el-descriptions-item label="批次机构总数">{{ preview.totalCount }}</el-descriptions-item>
        </el-descriptions>

        <div class="score-panel">
          <div class="score-block">
            <span class="score-label">合规评分</span>
            <span class="score-num" :class="scoreClass(preview.status)">{{ preview.score }}</span>
            <el-tag :type="statusType(preview.status)" size="small">{{ statusLabel(preview.status) }}</el-tag>
          </div>
          <div class="score-block">
            <span class="score-label">问题项</span>
            <span class="score-num">{{ preview.issueCount }}</span>
          </div>
        </div>

        <el-divider content-position="left">问题清单 &amp; 整改建议</el-divider>
        <el-table :data="preview.issues" border stripe size="small">
          <el-table-column prop="ruleName" label="规则名" min-width="170" show-overflow-tooltip />
          <el-table-column prop="fieldName" label="字段" width="120" show-overflow-tooltip />
          <el-table-column prop="ruleDesc" label="规则描述" min-width="170" show-overflow-tooltip />
          <el-table-column prop="actualValue" label="实际值" width="110" show-overflow-tooltip>
            <template #default="scope"><span v-if="scope.row.actualValue">{{ scope.row.actualValue }}</span><span v-else class="text-muted">空</span></template>
          </el-table-column>
          <el-table-column prop="expectedValue" label="预期" width="110" show-overflow-tooltip />
          <el-table-column prop="deductScore" label="扣分" width="70" align="center" />
          <el-table-column prop="suggestion" label="整改建议" min-width="190" show-overflow-tooltip />
        </el-table>
        <el-empty v-if="!preview.issues.length" description="无问题项（全部合规）" :image-size="60" />

        <div class="preview-footer">
          <el-button :icon="Printer" @click="handlePrint">打印</el-button>
          <el-button type="warning" :icon="Document" @click="handlePdf">导出 PDF</el-button>
          <el-button type="primary" :icon="Download" @click="exportPreviewExcel">导出 Excel</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 问题项抽屉 -->
    <el-drawer v-model="issueVisible" :title="`问题项：${currentIssueRow?.orgName ?? ''}`" size="56%">
      <el-table v-loading="issueLoading" :data="issues" border stripe size="small">
        <el-table-column prop="ruleName" label="规则名" min-width="170" show-overflow-tooltip />
        <el-table-column prop="fieldName" label="字段" width="120" show-overflow-tooltip />
        <el-table-column prop="ruleDesc" label="规则描述" min-width="170" show-overflow-tooltip />
        <el-table-column prop="actualValue" label="实际值" width="110" show-overflow-tooltip>
          <template #default="scope"><span v-if="scope.row.actualValue">{{ scope.row.actualValue }}</span><span v-else class="text-muted">空</span></template>
        </el-table-column>
        <el-table-column prop="expectedValue" label="预期" width="110" show-overflow-tooltip />
        <el-table-column prop="deductScore" label="扣分" width="70" align="center" />
        <el-table-column prop="suggestion" label="整改建议" min-width="190" show-overflow-tooltip />
      </el-table>
      <el-empty v-if="!issueLoading && !issues.length" description="无问题项（全部合规）" :image-size="60" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Document, Printer, Refresh, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  exportReport,
  getReportList,
  getReportPreview,
  type ReportIssue,
  type ReportMetrics,
  type ReportPreview,
  type ReportResult,
} from '@/api/report'
import { getBatchList, type CheckBatch } from '@/api/engine'
import { getInstitutions, type InstitutionOption } from '@/api/checkScore'
import { getTemplatePage, type TemplateItem } from '@/api/superviseTemplate'

const userStore = useUserStore()

// ============ 权限 ============
const isSupervisor = computed(() => userStore.role === 'supervisor')
const isInstitutionAdmin = computed(() => userStore.role === 'orgAdmin')

// ============ 下拉数据源 ============
const batches = ref<CheckBatch[]>([])
const institutions = ref<InstitutionOption[]>([])
const templates = ref<TemplateItem[]>([])

async function loadOptions() {
  try {
    const [bRes, iRes, tRes] = await Promise.all([
      getBatchList({ pageNum: 1, pageSize: 200 }),
      getInstitutions(),
      getTemplatePage({ pageNum: 1, pageSize: 200 }),
    ])
    batches.value = bRes.data.list
    institutions.value = iRes.data.filter((o: InstitutionOption) => o.id !== 1)
    templates.value = tRes.data.list
  } catch (e) {
    ElMessage.error((e as Error).message || '加载筛选数据源失败')
  }
}

// ============ 列表 + 指标 ============
const loading = ref(false)
const tableData = ref<ReportResult[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const metrics = ref<ReportMetrics>({ totalCount: 0, passRate: 0, warnRate: 0, failRate: 0, avgScore: 0 })
const queryForm = reactive({
  batchId: undefined as number | undefined,
  orgName: '',
  templateId: undefined as number | undefined,
  status: undefined as number | undefined,
  timeRange: [] as string[],
})

async function loadData() {
  loading.value = true
  try {
    const range = queryForm.timeRange ?? []
    const start = range[0]
    const end = range[1]
    const res = await getReportList({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      batchId: queryForm.batchId,
      orgName: queryForm.orgName || undefined,
      templateId: queryForm.templateId,
      status: queryForm.status,
      startTime: start || undefined,
      endTime: end || undefined,
    })
    metrics.value = res.data.metrics
    tableData.value = res.data.page.list
    total.value = res.data.page.total
  } catch (e) {
    ElMessage.error((e as Error).message || '加载结果失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() { pageNum.value = 1; loadData() }
function handleSizeChange() { pageNum.value = 1; loadData() }
function resetQuery() {
  queryForm.batchId = undefined
  queryForm.orgName = ''
  queryForm.templateId = undefined
  queryForm.status = undefined
  queryForm.timeRange = []
  handleQuery()
}

// ============ 报告预览抽屉 ============
const previewVisible = ref(false)
const preview = ref<ReportPreview | null>(null)
const currentPreviewRow = ref<ReportResult | null>(null)

async function openPreview(row: ReportResult) {
  try {
    const res = await getReportPreview(row.resultId)
    preview.value = res.data
    currentPreviewRow.value = row
    previewVisible.value = true
  } catch (e) {
    ElMessage.error((e as Error).message || '加载报告失败')
  }
}

// ============ 问题项抽屉 ============
const issueVisible = ref(false)
const issueLoading = ref(false)
const issues = ref<ReportIssue[]>([])
const currentIssueRow = ref<ReportResult | null>(null)

async function openIssues(row: ReportResult) {
  currentIssueRow.value = row
  issueVisible.value = true
  issueLoading.value = true
  issues.value = []
  try {
    const res = await getReportPreview(row.resultId)
    issues.value = res.data.issues
  } catch (e) {
    ElMessage.error((e as Error).message || '加载问题项失败')
  } finally {
    issueLoading.value = false
  }
}

// ============ 导出 ============
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

async function exportSummary() {
  try {
    const blob = (await exportReport({ batchId: queryForm.batchId })) as unknown as Blob
    saveBlob(blob, `合规结果汇总${queryForm.batchId ? '_' + queryForm.batchId : ''}.xlsx`)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error((e as Error).message || '导出失败')
  }
}

async function exportSelf() {
  try {
    const blob = (await exportReport({})) as unknown as Blob
    saveBlob(blob, '合规报告_本机构.xlsx')
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error((e as Error).message || '导出失败')
  }
}

async function exportSingle(row: ReportResult) {
  try {
    const blob = (await exportReport({ batchId: row.batchId, orgId: row.orgId })) as unknown as Blob
    saveBlob(blob, `合规报告_${row.orgName}.xlsx`)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error((e as Error).message || '导出失败')
  }
}

function exportPreviewExcel() {
  if (!currentPreviewRow.value) return
  exportSingle(currentPreviewRow.value)
}

function handlePrint() {
  ElMessage.info('演示：打印报告')
}
function handlePdf() {
  ElMessage.info('演示：导出 PDF')
}

// ============ 工具函数 ============
function formatTime(t?: string) {
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

onMounted(() => {
  loadOptions()
  loadData()
})
</script>

<style scoped>
.report-container {
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
.filter-card,
.table-card {
  border-radius: 8px;
}
.table-card {
  margin-top: 16px;
}
.stat-row {
  margin-top: 16px;
  margin-bottom: 0;
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
.text-muted { color: #c0c4cc; }
.preview-desc {
  margin-bottom: 16px;
}
.score-panel {
  display: flex;
  gap: 48px;
  margin: 16px 0;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.score-block {
  display: flex;
  align-items: center;
  gap: 12px;
}
.score-label {
  font-size: 14px;
  color: #606266;
}
.score-num {
  font-size: 30px;
  font-weight: 700;
}
.preview-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
