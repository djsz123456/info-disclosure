<template>
  <div class="check-container">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2>规则配置</h2>
        <p class="header-desc">基于模板动态字段，模拟合规检查引擎，自动计算必填率、格式率与检查得分</p>
      </div>
      <el-button v-if="isAdmin" type="primary" :icon="VideoPlay" @click="openExecute()">执行检查</el-button>
    </div>

    <el-alert
      v-if="!isAdmin"
      class="readonly-alert"
      type="info"
      show-icon
      :closable="false"
      :title="isLoggedIn ? '当前账号为只读权限，仅可查看检查结果' : '游客模式：仅可查看检查结果，如需执行检查请先登录'" />

    <!-- 筛选卡片 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="queryForm" inline>
        <el-form-item label="模板名称">
          <el-input v-model="queryForm.templateName" placeholder="请输入模板名称" clearable style="width: 200px"
                    @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="机构ID">
          <el-input v-model="queryForm.institutionId" placeholder="请输入机构ID" clearable style="width: 140px"
                    @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部" clearable style="width: 130px">
            <el-option label="通过" :value="1" />
            <el-option label="不通过" :value="0" />
            <el-option label="待检" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格卡片 -->
    <el-card class="table-card" shadow="never">
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column label="编号" width="70" align="center">
          <template #default="scope">{{ (pageNum - 1) * pageSize + scope.$index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="templateName" label="模板名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="institutionId" label="机构ID" width="90" align="center" />
        <el-table-column label="必填完成度" width="160">
          <template #default="scope">
            <el-progress :percentage="scope.row.requiredRate" :stroke-width="8" :color="progressColor(scope.row.requiredRate)" />
          </template>
        </el-table-column>
        <el-table-column label="格式合规率" width="160">
          <template #default="scope">
            <el-progress :percentage="scope.row.formatRate" :stroke-width="8" :color="progressColor(scope.row.formatRate)" />
          </template>
        </el-table-column>
        <el-table-column label="检查得分" width="100" align="center">
          <template #default="scope">
            <span class="score" :class="scope.row.score >= 60 ? 'score-pass' : 'score-fail'">{{ scope.row.score }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="checkTime" label="检查时间" width="170">
          <template #default="scope">{{ formatTime(scope.row.checkTime) }}</template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="110" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openView(scope.row)">查看</el-button>
            <template v-if="isAdmin">
              <el-button link type="success" @click="openExecute(scope.row)">执行检查</el-button>
              <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
            </template>
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
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 执行检查弹窗（核心：选择模板联动字段 + 模拟检查引擎 + 结果展示） -->
    <el-dialog v-model="execVisible" title="执行合规检查" width="720px" destroy-on-close>
      <el-form label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="选择模板">
              <el-select v-model="execForm.templateId" placeholder="请选择模板" filterable style="width: 100%"
                         @change="onTemplateChange">
                <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="选择机构">
              <el-select v-model="execForm.institutionId" placeholder="请选择机构" filterable style="width: 100%">
                <el-option v-for="i in institutions" :key="i.id" :label="`${i.orgName} (ID:${i.id})`" :value="i.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-divider content-position="left">模板字段（检查依据）</el-divider>
      <el-table v-if="templateFields.length" :data="templateFields" border size="small" max-height="200">
        <el-table-column prop="sort" label="序号" width="60" align="center" />
        <el-table-column prop="fieldName" label="字段名" min-width="140" />
        <el-table-column label="是否必填" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.required === 1 ? 'danger' : 'info'" size="small">
              {{ scope.row.required === 1 ? '必填' : '选填' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fieldType" label="字段类型" width="110" />
        <el-table-column prop="formatRule" label="格式规则" min-width="160" show-overflow-tooltip />
      </el-table>
      <el-empty v-if="!templateFields.length" description="请先选择模板" :image-size="60" />

      <!-- 检查结果 -->
      <template v-if="execResult">
        <el-divider content-position="left">检查结果</el-divider>
        <div class="result-panel">
          <div class="result-score">
            <span class="result-score-label">综合得分</span>
            <span class="result-score-num" :class="execResult.score >= 60 ? 'pass' : 'fail'">{{ execResult.score }}</span>
            <el-tag :type="execResult.status === 1 ? 'success' : 'danger'">{{ execResult.status === 1 ? '通过' : '不通过' }}</el-tag>
          </div>
          <div class="result-bars">
            <div class="result-bar">
              <span class="result-bar-label">必填完成度</span>
              <el-progress :percentage="execResult.requiredRate" :stroke-width="10" :color="progressColor(execResult.requiredRate)" />
            </div>
            <div class="result-bar">
              <span class="result-bar-label">格式合规率</span>
              <el-progress :percentage="execResult.formatRate" :stroke-width="10" :color="progressColor(execResult.formatRate)" />
            </div>
          </div>
          <div class="result-remark">
            <span class="result-remark-label">检查备注</span>
            <span>{{ execResult.remark }}</span>
          </div>
        </div>
      </template>

      <template #footer>
        <el-button @click="execVisible = false">关闭</el-button>
        <el-button type="primary" :loading="execLoading" @click="runCheck">开始检查</el-button>
      </template>
    </el-dialog>

    <!-- 查看弹窗（只读） -->
    <el-dialog v-model="viewVisible" title="检查详情" width="640px">
      <el-descriptions v-if="viewData" :column="2" border>
        <el-descriptions-item label="模板名称">{{ viewData.templateName }}</el-descriptions-item>
        <el-descriptions-item label="机构ID">{{ viewData.institutionId }}</el-descriptions-item>
        <el-descriptions-item label="必填完成度">{{ viewData.requiredRate }}%</el-descriptions-item>
        <el-descriptions-item label="格式合规率">{{ viewData.formatRate }}%</el-descriptions-item>
        <el-descriptions-item label="检查得分">{{ viewData.score }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(viewData.status)" size="small">{{ statusLabel(viewData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作人">{{ viewData.operator }}</el-descriptions-item>
        <el-descriptions-item label="检查时间">{{ formatTime(viewData.checkTime) }}</el-descriptions-item>
        <el-descriptions-item label="检查备注" :span="2">{{ viewData.remark }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="viewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, VideoPlay } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getTemplateDetail, getTemplatePage, type TemplateField, type TemplateItem } from '@/api/superviseTemplate'
import {
  deleteCheck,
  executeCheck,
  getCheckPage,
  getInstitutions,
  type CheckItem,
  type InstitutionOption,
} from '@/api/checkScore'

const userStore = useUserStore()

// ============ 权限判断（示意） ============
const isAdmin = computed(() => userStore.role === 'orgAdmin' || userStore.role === 'supervisor') // 机构管理员/监管员
const isLoggedIn = computed(() => userStore.isLoggedIn)

// ============ 列表 ============
const loading = ref(false)
const tableData = ref<CheckItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const queryForm = reactive({
  templateName: '',
  institutionId: '' as string,
  status: undefined as number | undefined,
})

async function loadData() {
  loading.value = true
  try {
    const res = await getCheckPage({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      templateName: queryForm.templateName || undefined,
      institutionId: queryForm.institutionId.trim() ? Number(queryForm.institutionId) : undefined,
      status: queryForm.status,
    })
    tableData.value = res.data.list
    total.value = res.data.total
  } catch (e) {
    ElMessage.error((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  pageNum.value = 1
  loadData()
}
function handleSizeChange() {
  pageNum.value = 1
  loadData()
}
function resetQuery() {
  queryForm.templateName = ''
  queryForm.institutionId = ''
  queryForm.status = undefined
  pageNum.value = 1
  loadData()
}

// ============ 执行检查 ============
const execVisible = ref(false)
const execLoading = ref(false)
const templates = ref<TemplateItem[]>([])
const institutions = ref<InstitutionOption[]>([])
const execForm = reactive({ templateId: undefined as number | undefined, institutionId: undefined as number | undefined })
const templateFields = ref<TemplateField[]>([])
const execResult = ref<CheckItem | null>(null)

async function openExecute(row?: CheckItem) {
  execVisible.value = true
  execResult.value = null
  templateFields.value = []
  execForm.templateId = row?.templateId
  execForm.institutionId = row?.institutionId
  const [tRes, iRes] = await Promise.all([
    getTemplatePage({ pageNum: 1, pageSize: 200 }),
    getInstitutions(),
  ])
  templates.value = tRes.data.list
  institutions.value = iRes.data
  if (row?.templateId) await loadTemplateFields(row.templateId)
}

async function loadTemplateFields(templateId: number) {
  templateFields.value = []
  const res = await getTemplateDetail(templateId)
  templateFields.value = res.data.fields ?? []
}

function onTemplateChange(id: number | undefined) {
  execResult.value = null
  if (id) {
    loadTemplateFields(id)
  } else {
    templateFields.value = []
  }
}

async function runCheck() {
  if (!execForm.templateId || !execForm.institutionId) {
    ElMessage.warning('请选择模板和机构')
    return
  }
  execLoading.value = true
  try {
    const res = await executeCheck({ templateId: execForm.templateId, institutionId: execForm.institutionId })
    execResult.value = res.data
    ElMessage.success('检查完成')
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '检查失败')
  } finally {
    execLoading.value = false
  }
}

// ============ 查看 ============
const viewVisible = ref(false)
const viewData = ref<CheckItem | null>(null)

function openView(row: CheckItem) {
  viewData.value = row
  viewVisible.value = true
}

// ============ 删除（机构管理员/监管员专属） ============
async function handleDelete(row: CheckItem) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.templateName}」在机构 ${row.institutionId} 的检查记录吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteCheck(row.id)
    ElMessage.success('删除成功')
    pageNum.value = 1
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败')
  }
}

// ============ 工具函数 ============
function progressColor(p: number) {
  return p >= 80 ? '#67C23A' : p >= 60 ? '#E6A23C' : '#F56C6C'
}
function statusLabel(status: number) {
  return status === 1 ? '通过' : status === 2 ? '待检' : '不通过'
}
function statusTagType(status: number): 'success' | 'danger' | 'info' {
  return status === 1 ? 'success' : status === 2 ? 'info' : 'danger'
}
function formatTime(t?: string) {
  return t ? t.replace('T', ' ') : ''
}

onMounted(loadData)
</script>

<style scoped>
.check-container {
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
.readonly-alert {
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
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.score {
  font-size: 18px;
  font-weight: 700;
}
.score-pass {
  color: #67c23a;
}
.score-fail {
  color: #f56c6c;
}

/* 检查结果面板 */
.result-panel {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
}
.result-score {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.result-score-label {
  font-size: 14px;
  color: #606266;
}
.result-score-num {
  font-size: 32px;
  font-weight: 700;
}
.result-score-num.pass {
  color: #67c23a;
}
.result-score-num.fail {
  color: #f56c6c;
}
.result-bars {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}
.result-bar {
  flex: 1;
}
.result-bar-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}
.result-remark {
  font-size: 13px;
  color: #303133;
  line-height: 1.6;
}
.result-remark-label {
  font-weight: 600;
  margin-right: 8px;
}
</style>
