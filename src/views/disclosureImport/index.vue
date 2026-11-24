<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  UploadFilled,
  Search,
  Refresh,
  View,
  DocumentChecked,
  CircleCheck,
  CircleClose,
  DataLine,
  Files,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getTemplateDetail, getTemplatePage, type TemplateItem, type TemplateField } from '@/api/superviseTemplate'
import {
  downloadTemplate,
  parseImport,
  confirmImport,
  getImportHistory,
  getImportDetails,
  downloadErrorReport,
  downloadPreviewErrorReport,
  getInstitutionList,
} from '@/api/disclosureImport'

const userStore = useUserStore()

// ============ 权限判断 ============
// 可写角色：机构管理员(INSTITUTION_ADMIN → orgAdmin)；监管员(REGULATOR → supervisor)按既有约定视为高权限
const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.role === 'orgAdmin' || userStore.role === 'supervisor')
const isSupervisor = computed(() => userStore.role === 'supervisor')

// ============ 状态映射 ============
const STATUS_MAP: Record<number, { label: string; type: 'success' | 'warning' | 'danger' | 'info' }> = {
  1: { label: '全部成功', type: 'success' },
  2: { label: '部分成功', type: 'warning' },
  3: { label: '全部失败', type: 'danger' },
}

// ============ 模板选择（模板列表接口公开，游客可读） ============
const templates = ref<TemplateItem[]>([])
const selectedTemplateId = ref<number>()
const templateDetail = ref<TemplateItem | null>(null)
const templateLoading = ref(false)

async function loadTemplates() {
  try {
    const res = await getTemplatePage({ pageNum: 1, pageSize: 200 })
    templates.value = res.data.list
    if (templates.value.length && !selectedTemplateId.value) {
      selectedTemplateId.value = templates.value.find((t) => t.status === 1)?.id ?? templates.value[0]?.id
    }
  } catch (e) {
    ElMessage.error((e as Error).message || '加载模板列表失败')
  }
}

const templateFields = computed<TemplateField[]>(() => templateDetail.value?.fields ?? [])
const fieldColumns = computed<string[]>(() => templateFields.value.map((f) => f.fieldName))

async function loadTemplateDetail() {
  if (!selectedTemplateId.value) {
    templateDetail.value = null
    return
  }
  templateLoading.value = true
  try {
    const res = await getTemplateDetail(selectedTemplateId.value)
    templateDetail.value = res.data
  } catch (e) {
    ElMessage.error((e as Error).message || '加载模板结构失败')
  } finally {
    templateLoading.value = false
  }
}

// ============ 下载模板 ============
const downloading = ref(false)
async function handleDownloadTemplate() {
  if (!selectedTemplateId.value) {
    ElMessage.warning('请先选择模板')
    return
  }
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再下载模板')
    return
  }
  downloading.value = true
  try {
    const blob = await downloadTemplate(selectedTemplateId.value) as unknown as Blob
    const name = templateDetail.value?.name ?? '披露数据'
    saveBlob(blob, `${name}-导入模板.xlsx`)
    ElMessage.success('模板下载成功')
  } catch (e) {
    ElMessage.error((e as Error).message || '模板下载失败')
  } finally {
    downloading.value = false
  }
}

// ============ 上传解析 ============
const fileList = ref<any[]>([])
const rawFile = ref<File | null>(null)
const parsing = ref(false)

function handleFileChange(file: any) {
  rawFile.value = file.raw ?? null
}

function handleFileRemove() {
  rawFile.value = null
}

async function handleParse() {
  if (!selectedTemplateId.value) {
    ElMessage.warning('请先选择模板')
    return
  }
  if (!rawFile.value) {
    ElMessage.warning('请先选择要上传的 Excel 文件')
    return
  }
  parsing.value = true
  try {
    const res = await parseImport(selectedTemplateId.value, rawFile.value)
    parseResult.value = res.data
    activeTab.value = parseResult.value.failCount > 0 ? 'fail' : 'success'
    ElMessage.success(`解析完成：成功 ${res.data.successCount} 行，失败 ${res.data.failCount} 行`)
  } catch (e) {
    ElMessage.error((e as Error).message || '解析失败')
  } finally {
    parsing.value = false
  }
}

// ============ 解析预览 ============
interface ParseResult {
  previewToken: string
  templateId: number
  templateName: string
  totalCount: number
  successCount: number
  failCount: number
  successRows: any[]
  failRows: any[]
  fields: TemplateField[]
}
const parseResult = ref<ParseResult | null>(null)
const activeTab = ref('success')

function resetPreview() {
  parseResult.value = null
  fileList.value = []
  rawFile.value = null
  activeTab.value = 'success'
}

// ============ 确认导入 / 导出错误报告 ============
const confirming = ref(false)
async function handleConfirm() {
  if (!parseResult.value) return
  const failCount = parseResult.value.failCount
  try {
    const tip = failCount > 0
      ? `将导入 ${parseResult.value.successCount} 行成功数据，跳过 ${failCount} 行失败数据，是否继续？`
      : `确认导入 ${parseResult.value.successCount} 行成功数据？`
    await ElMessageBox.confirm(tip, '确认导入', { type: 'warning' })
  } catch {
    return
  }
  confirming.value = true
  try {
    const res = await confirmImport(parseResult.value.previewToken)
    const r = res.data
    ElMessage.success(`导入成功：批次号 ${r.batchNo}，成功 ${r.successCount} 行`)
    resetPreview()
    pageNum.value = 1
    loadHistory()
  } catch (e) {
    ElMessage.error((e as Error).message || '确认导入失败')
  } finally {
    confirming.value = false
  }
}

async function handleExportPreviewError() {
  if (!parseResult.value) return
  try {
    const blob = await downloadPreviewErrorReport(parseResult.value.previewToken) as unknown as Blob
    saveBlob(blob, '导入错误报告-预览.xlsx')
  } catch (e) {
    ElMessage.error((e as Error).message || '导出失败')
  }
}

// ============ 历史查询 ============
const historyList = ref<any[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const historyLoading = ref(false)
const queryForm = reactive({
  templateId: undefined as number | undefined,
  institutionId: undefined as number | undefined,
  status: undefined as number | undefined,
  timeRange: [] as string[],
})
const institutions = ref<any[]>([])

async function loadInstitutions() {
  if (!isSupervisor.value) return
  try {
    const res = await getInstitutionList()
    institutions.value = res.data ?? []
  } catch {
    // 非监管员或无权限时忽略
  }
}

async function loadHistory() {
  if (!isLoggedIn.value) return
  historyLoading.value = true
  try {
    const res = await getImportHistory({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      templateId: queryForm.templateId,
      institutionId: queryForm.institutionId,
      status: queryForm.status,
      startTime: queryForm.timeRange?.[0],
      endTime: queryForm.timeRange?.[1],
    })
    historyList.value = res.data.list
    total.value = res.data.total
  } catch (e) {
    ElMessage.error((e as Error).message || '加载历史失败')
  } finally {
    historyLoading.value = false
  }
}

function handleHistoryQuery() {
  pageNum.value = 1
  loadHistory()
}

function handleHistoryReset() {
  queryForm.templateId = undefined
  queryForm.institutionId = undefined
  queryForm.status = undefined
  queryForm.timeRange = []
  pageNum.value = 1
  loadHistory()
}

function handlePageChange() {
  loadHistory()
}

// ============ 明细 ============
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<any>(null)
const detailFields = ref<string[]>([])

async function openDetail(row: any) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    const res = await getImportDetails(row.id)
    detailData.value = res.data
    detailFields.value = collectFieldNames(res.data?.details ?? [])
  } catch (e) {
    ElMessage.error((e as Error).message || '加载明细失败')
  } finally {
    detailLoading.value = false
  }
}

function collectFieldNames(details: any[]): string[] {
  const names = new Set<string>()
  for (const d of details) {
    if (d.fieldData) {
      Object.keys(d.fieldData).forEach((k) => names.add(k))
    }
  }
  return Array.from(names)
}

// ============ 历史错误报告 ============
async function handleDownloadErrorReport(row: any) {
  try {
    const blob = await downloadErrorReport(row.id) as unknown as Blob
    saveBlob(blob, `导入错误报告-${row.batchNo}.xlsx`)
  } catch (e) {
    ElMessage.error((e as Error).message || '导出失败')
  }
}

// ============ 通用 ============
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 游客示例数据（只读浏览）
const guestExample = {
  success: [
    { rowNum: 1, institution: '示例机构A', fieldSummary: '实缴资本 1000.00 / 预期收益率 8.5% / 披露日期 2026-01-01', result: '校验通过' },
    { rowNum: 2, institution: '示例机构A', fieldSummary: '实缴资本 2000.00 / 预期收益率 9.0% / 披露日期 2026-02-01', result: '校验通过' },
  ],
  fail: [
    { rowNum: 3, institution: '示例机构A', fieldSummary: '实缴资本 (空) / 预期收益率 10% / 披露日期 2026-03-01', reason: '必填字段[paid_capital]为空' },
    { rowNum: 4, institution: '示例机构B', fieldSummary: '实缴资本 3000 / 预期收益率 12.5% / 披露日期 2026-04-01', reason: '机构ID不存在：99' },
  ],
}

onMounted(async () => {
  await loadTemplates()
  loadTemplateDetail()
  loadInstitutions()
  if (isLoggedIn.value) {
    loadHistory()
  }
})
</script>

<template>
  <div class="import-container">
    <!-- 顶部标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2>信息披露批量导入</h2>
        <p class="header-desc">按模板定义动态字段下载模板 → 上传 Excel 解析校验 → 预览成败 → 确认导入 → 追溯批次历史</p>
      </div>
    </div>

    <!-- 游客提示条 / 角色提示条 -->
    <el-alert
      v-if="!isLoggedIn"
      class="notice-bar"
      type="warning"
      show-icon
      :closable="false"
      title="当前为游客模式：仅可浏览模板结构与示例数据；下载模板、上传解析、确认导入等操作需登录后使用" />
    <el-alert
      v-else
      class="notice-bar"
      type="success"
      show-icon
      :closable="false"
      :title="isSupervisor
        ? '当前为监管员：可纵观全局，导入/查看任意机构披露数据'
        : '当前为机构管理员：仅可导入/查看本机构披露数据'" />

    <!-- 流程步骤条 -->
    <el-card class="block-card" shadow="never">
      <el-steps :active="isLoggedIn ? 3 : 0" align-center finish-status="success">
        <el-step title="选择模板" description="联动模板定义动态字段" />
        <el-step title="下载模板" description="生成表头 + 示例行" />
        <el-step title="上传解析" description="逐行校验必填与格式" />
        <el-step title="预览确认" description="成功/失败 + 错误原因" />
        <el-step title="批次追溯" description="历史与错误报告" />
      </el-steps>
    </el-card>

    <!-- 操作区：模板选择 + 下载 + 上传 -->
    <el-card class="block-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Files /></el-icon>
          <span>① 选择模板并下载 / 上传 Excel</span>
        </div>
      </template>

      <el-row :gutter="20">
        <!-- 左：模板选择 + 下载 -->
        <el-col :span="12">
          <div class="panel-title">模板选择</div>
          <el-select
            v-model="selectedTemplateId"
            placeholder="请选择披露模板"
            style="width: 100%"
            filterable
            @change="loadTemplateDetail">
            <el-option v-for="t in templates" :key="t.id" :label="`${t.name}（${t.code}）`" :value="t.id" />
          </el-select>

          <div class="panel-title" style="margin-top: 16px">模板结构说明（联动模板定义）</div>
          <div v-loading="templateLoading">
            <el-table v-if="templateFields.length" :data="templateFields" border size="small">
              <el-table-column type="index" label="#" width="46" align="center" />
              <el-table-column prop="fieldName" label="字段名" min-width="140" />
              <el-table-column label="是否必填" width="88" align="center">
                <template #default="scope">
                  <el-tag :type="scope.row.required === 1 ? 'danger' : 'info'" size="small">
                    {{ scope.row.required === 1 ? '必填' : '选填' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="fieldType" label="类型" width="100" />
              <el-table-column prop="formatRule" label="格式规则" min-width="150" show-overflow-tooltip>
                <template #default="scope">{{ scope.row.formatRule || '—' }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="请选择模板查看字段结构" :image-size="60" />
          </div>

          <el-button
            class="download-btn"
            type="primary"
            :icon="Download"
            :loading="downloading"
            :disabled="!isLoggedIn || !selectedTemplateId"
            @click="handleDownloadTemplate">
            {{ isLoggedIn ? '下载 Excel 模板' : '下载模板（需登录）' }}
          </el-button>
        </el-col>

        <!-- 右：上传解析 -->
        <el-col :span="12">
          <div class="panel-title">上传 Excel 解析</div>
          <template v-if="isLoggedIn">
            <el-upload
              v-model:file-list="fileList"
              drag
              :auto-upload="false"
              :limit="1"
              accept=".xlsx,.xls"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove">
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">将 Excel 文件拖到此处，或<em>点击选择</em></div>
              <template #tip>
                <div class="el-upload__tip">请使用「下载模板」生成的文件填写；仅支持 .xlsx / .xls</div>
              </template>
            </el-upload>
            <el-button
              class="parse-btn"
              type="success"
              :icon="DataLine"
              :loading="parsing"
              :disabled="!rawFile"
              @click="handleParse">
              上传并解析预览
            </el-button>
          </template>
          <el-empty v-else description="登录后可上传 Excel 进行解析校验" :image-size="80" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 预览区：Tabs 校验成功 / 校验失败 -->
    <el-card v-if="parseResult && isLoggedIn" class="block-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><DocumentChecked /></el-icon>
          <span>② 解析预览 — 模板「{{ parseResult.templateName }}」</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 成功列表 -->
        <el-tab-pane name="success">
          <template #label>
            <span class="tab-label">
              <el-icon><CircleCheck /></el-icon>
              校验成功
              <el-badge :value="parseResult.successCount" type="success" class="tab-badge" />
            </span>
          </template>
          <el-table :data="parseResult.successRows" border stripe max-height="360">
            <el-table-column prop="rowNum" label="行号" width="70" align="center" />
            <el-table-column prop="institutionName" label="机构" width="140" show-overflow-tooltip />
            <el-table-column
              v-for="f in fieldColumns"
              :key="f"
              :label="f"
              :prop="`fieldData.${f}`"
              min-width="130"
              show-overflow-tooltip />
          </el-table>
        </el-tab-pane>

        <!-- 失败列表 -->
        <el-tab-pane name="fail">
          <template #label>
            <span class="tab-label">
              <el-icon><CircleClose /></el-icon>
              校验失败
              <el-badge :value="parseResult.failCount" type="danger" class="tab-badge" />
            </span>
          </template>
          <el-table :data="parseResult.failRows" border stripe max-height="360">
            <el-table-column prop="rowNum" label="行号" width="70" align="center" />
            <el-table-column prop="institutionName" label="机构" width="140" show-overflow-tooltip />
            <el-table-column
              v-for="f in fieldColumns"
              :key="f"
              :label="f"
              :prop="`fieldData.${f}`"
              min-width="130"
              show-overflow-tooltip />
            <el-table-column label="错误原因" min-width="220" fixed="right">
              <template #default="scope">
                <el-text type="danger">{{ scope.row.errorMsg }}</el-text>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <!-- 确认导入区 -->
      <div class="confirm-bar">
        <div class="confirm-stats">
          <el-statistic title="总行数" :value="parseResult.totalCount" />
          <el-statistic title="成功数" :value="parseResult.successCount" />
          <el-statistic title="失败数" :value="parseResult.failCount" />
        </div>
        <div class="confirm-actions">
          <el-button
            v-if="isAdmin"
            type="primary"
            :icon="CircleCheck"
            :loading="confirming"
            :disabled="parseResult.successCount === 0"
            @click="handleConfirm">
            确认导入成功数据
          </el-button>
          <el-button
            v-if="isAdmin"
            type="warning"
            :icon="Download"
            :disabled="parseResult.failCount === 0"
            @click="handleExportPreviewError">
            导出错误报告
          </el-button>
          <el-button @click="resetPreview">重新上传</el-button>
        </div>
      </div>
    </el-card>

    <!-- 游客示例预览 -->
    <el-card v-if="!isLoggedIn" class="block-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><View /></el-icon>
          <span>② 解析预览示例（游客只读演示）</span>
          <el-tag type="info" size="small" style="margin-left: 8px">示例数据</el-tag>
        </div>
      </template>
      <el-tabs>
        <el-tab-pane :label="`校验成功示例（${guestExample.success.length}）`">
          <el-table :data="guestExample.success" border stripe>
            <el-table-column prop="rowNum" label="行号" width="70" align="center" />
            <el-table-column prop="institution" label="机构" width="140" />
            <el-table-column prop="fieldSummary" label="字段值（示例）" min-width="360" />
            <el-table-column prop="result" label="校验结果" width="120" align="center">
              <template #default="scope"><el-tag type="success">{{ scope.row.result }}</el-tag></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane :label="`校验失败示例（${guestExample.fail.length}）`">
          <el-table :data="guestExample.fail" border stripe>
            <el-table-column prop="rowNum" label="行号" width="70" align="center" />
            <el-table-column prop="institution" label="机构" width="140" />
            <el-table-column prop="fieldSummary" label="字段值（示例）" min-width="320" />
            <el-table-column prop="reason" label="错误原因" min-width="220">
              <template #default="scope"><el-text type="danger">{{ scope.row.reason }}</el-text></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 历史批次 -->
    <el-card v-if="isLoggedIn" class="block-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Search /></el-icon>
          <span>③ 导入批次历史</span>
        </div>
      </template>

      <el-form :model="queryForm" inline class="history-filter">
        <el-form-item label="模板">
          <el-select v-model="queryForm.templateId" placeholder="全部" clearable filterable style="width: 200px">
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isSupervisor" label="机构">
          <el-select v-model="queryForm.institutionId" placeholder="全部" clearable filterable style="width: 180px">
            <el-option v-for="i in institutions" :key="i.id" :label="i.orgName" :value="i.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部" clearable style="width: 130px">
            <el-option label="全部成功" :value="1" />
            <el-option label="部分成功" :value="2" />
            <el-option label="全部失败" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="queryForm.timeRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleHistoryQuery">查询</el-button>
          <el-button :icon="Refresh" @click="handleHistoryReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="historyLoading" :data="historyList" border stripe>
        <el-table-column prop="batchNo" label="批次号" width="200" show-overflow-tooltip />
        <el-table-column prop="templateName" label="模板名称" min-width="170" show-overflow-tooltip />
        <el-table-column prop="institutionName" label="机构" width="140" show-overflow-tooltip />
        <el-table-column label="成功数" width="90" align="center">
          <template #default="scope"><el-tag type="success" effect="light">{{ scope.row.successCount }}</el-tag></template>
        </el-table-column>
        <el-table-column label="失败数" width="90" align="center">
          <template #default="scope"><el-tag type="danger" effect="light">{{ scope.row.failCount }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="scope">
            <el-tag :type="STATUS_MAP[scope.row.status]?.type ?? 'info'">
              {{ STATUS_MAP[scope.row.status]?.label ?? '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="导入时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="View" @click="openDetail(scope.row)">查看明细</el-button>
            <el-button
              v-if="isAdmin && scope.row.failCount > 0"
              link
              type="warning"
              :icon="Download"
              @click="handleDownloadErrorReport(scope.row)">
              下载错误报告
            </el-button>
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
          @current-change="handlePageChange"
          @size-change="handlePageChange" />
      </div>
    </el-card>

    <!-- 明细弹窗 -->
    <el-dialog v-model="detailVisible" title="导入批次明细" width="860px" destroy-on-close>
      <div v-loading="detailLoading">
        <template v-if="detailData">
          <el-descriptions :column="4" border size="small" class="detail-desc">
            <el-descriptions-item label="批次号">{{ detailData.batchNo }}</el-descriptions-item>
            <el-descriptions-item label="模板">{{ detailData.templateName }}</el-descriptions-item>
            <el-descriptions-item label="机构">{{ detailData.institutionName }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="STATUS_MAP[detailData.status]?.type ?? 'info'" size="small">
                {{ STATUS_MAP[detailData.status]?.label ?? '未知' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <el-table :data="detailData.details" border stripe size="small" max-height="420">
            <el-table-column prop="rowNum" label="行号" width="60" align="center" />
            <el-table-column prop="institutionName" label="机构" width="120" show-overflow-tooltip />
            <el-table-column
              v-for="f in detailFields"
              :key="f"
              :label="f"
              :prop="`fieldData.${f}`"
              min-width="120"
              show-overflow-tooltip />
            <el-table-column label="状态" width="80" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'" size="small">
                  {{ scope.row.status === 1 ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="errorMsg" label="错误原因" min-width="180" show-overflow-tooltip />
          </el-table>
        </template>
      </div>
      <template #footer>
        <el-button type="primary" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.import-container {
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

.notice-bar {
  margin-bottom: 16px;
  border-radius: 8px;
}

.block-card {
  border-radius: 8px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1f2937;
}

.panel-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.download-btn,
.parse-btn {
  margin-top: 16px;
  width: 100%;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab-badge {
  margin-left: 6px;
}

.confirm-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding: 16px;
  background-color: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.confirm-stats {
  display: flex;
  gap: 40px;
}
.confirm-actions {
  display: flex;
  gap: 12px;
}

.history-filter {
  margin-bottom: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-desc {
  margin-bottom: 12px;
}
</style>
