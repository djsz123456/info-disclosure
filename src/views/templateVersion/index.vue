<template>
  <div class="version-container">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2>版本管理</h2>
        <p class="header-desc">对模板结构生成快照版本，支持历史回溯与结构对比，追踪配置变更</p>
      </div>
      <el-button v-if="isAdmin" type="primary" :icon="Plus" @click="openGenerate">生成新版本</el-button>
    </div>

    <el-alert
      v-if="!isAdmin"
      class="readonly-alert"
      type="info"
      show-icon
      :closable="false"
      :title="isLoggedIn ? '当前账号为只读权限，仅可查看版本' : '游客模式：仅可查看版本，如需生成版本请先登录'" />

    <!-- 筛选卡片 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="queryForm" inline>
        <el-form-item label="模板名称">
          <el-input v-model="queryForm.templateName" placeholder="请输入模板名称" clearable style="width: 200px"
                    @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="版本号">
          <el-input v-model="queryForm.versionNo" placeholder="如 v1.0.1" clearable style="width: 160px"
                    @keyup.enter="handleQuery" />
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
        <el-table-column label="版本号" width="120" align="center">
          <template #default="scope">
            <el-tag type="primary" effect="light">{{ scope.row.versionNo }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="changeSummary" label="变更摘要" min-width="220" show-overflow-tooltip />
        <el-table-column prop="creator" label="变更人" width="110" />
        <el-table-column prop="createTime" label="创建时间" width="170">
          <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openSnapshot(scope.row)">查看快照</el-button>
            <el-button link type="warning" @click="openCompare(scope.row)">对比</el-button>
            <el-button v-if="isAdmin" link type="danger" @click="handleDelete(scope.row)">删除</el-button>
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

    <!-- 版本快照弹窗（只读，展示该版本字段配置） -->
    <el-dialog v-model="snapVisible" title="版本快照" width="720px">
      <div v-loading="snapLoading">
        <el-descriptions v-if="snapData" :column="2" border>
          <el-descriptions-item label="模板名称">{{ snapData.snapshot?.templateName ?? snapData.templateName }}</el-descriptions-item>
          <el-descriptions-item label="版本号">
            <el-tag type="primary" size="small">{{ snapData.versionNo }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="产出范围">{{ snapData.snapshot?.outputScope ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ snapData.snapshot?.deadline ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="变更人">{{ snapData.creator }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(snapData.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="变更摘要" :span="2">{{ snapData.changeSummary }}</el-descriptions-item>
        </el-descriptions>

        <div class="snap-fields-title">字段配置快照（{{ snapData?.snapshot?.fields?.length ?? 0 }} 项）</div>
        <el-table :data="snapData?.snapshot?.fields ?? []" border size="small">
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
      </div>
      <template #footer>
        <el-button type="primary" @click="snapVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 对比弹窗（快照 vs 当前模板结构） -->
    <el-dialog v-model="compareVisible" :title="compareTitle" width="680px">
      <div v-loading="compareLoading">
        <el-table :data="compareRows" border size="small">
          <el-table-column label="变更类型" width="100" align="center">
            <template #default="scope">
              <el-tag :type="diffTagType(scope.row.type)" size="small">{{ diffLabel(scope.row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="fieldName" label="字段名" width="160" />
          <el-table-column prop="detail" label="变更说明" min-width="280" show-overflow-tooltip />
        </el-table>
        <el-empty v-if="!compareRows.length && !compareLoading" description="该版本与当前模板结构完全一致，无差异" :image-size="60" />
      </div>
      <template #footer>
        <el-button type="primary" @click="compareVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 生成新版本弹窗（机构管理员/监管员专属） -->
    <el-dialog v-model="genVisible" title="生成新版本" width="520px">
      <el-form label-width="100px">
        <el-form-item label="选择模板">
          <el-select v-model="genForm.templateId" placeholder="请选择要生成快照的模板" filterable style="width: 100%">
            <el-option v-for="t in genTemplates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="变更摘要">
          <el-input v-model="genForm.changeSummary" type="textarea" :rows="3"
                    placeholder="可选，留空则自动生成摘要（如：字段 N 项、必填 M 项）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="genVisible = false">取消</el-button>
        <el-button type="primary" :loading="genLoading" @click="submitGenerate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getTemplateDetail, getTemplatePage, type TemplateField, type TemplateItem } from '@/api/superviseTemplate'
import {
  deleteVersion,
  generateVersion,
  getVersionPage,
  getVersionSnapshot,
  type SnapshotField,
  type VersionItem,
  type VersionSnapshot,
} from '@/api/templateVersion'

const userStore = useUserStore()

// ============ 权限判断（示意） ============
const isAdmin = computed(() => userStore.role === 'orgAdmin' || userStore.role === 'supervisor') // 机构管理员/监管员
const isLoggedIn = computed(() => userStore.isLoggedIn)

// ============ 列表 ============
const loading = ref(false)
const tableData = ref<VersionItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const queryForm = reactive({ templateName: '', versionNo: '' })

async function loadData() {
  loading.value = true
  try {
    const res = await getVersionPage({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      templateName: queryForm.templateName || undefined,
      versionNo: queryForm.versionNo || undefined,
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
  queryForm.versionNo = ''
  pageNum.value = 1
  loadData()
}

// ============ 查看快照 ============
const snapVisible = ref(false)
const snapLoading = ref(false)
const snapData = ref<VersionSnapshot | null>(null)

async function openSnapshot(row: VersionItem) {
  snapVisible.value = true
  snapLoading.value = true
  snapData.value = null
  try {
    const res = await getVersionSnapshot(row.id)
    snapData.value = res.data
  } catch (e) {
    ElMessage.error((e as Error).message || '加载快照失败')
  } finally {
    snapLoading.value = false
  }
}

// ============ 对比（快照 vs 当前模板） ============
interface DiffRow {
  type: 'added' | 'removed' | 'modified'
  fieldName: string
  detail: string
}

const compareVisible = ref(false)
const compareLoading = ref(false)
const compareTitle = ref('')
const compareRows = ref<DiffRow[]>([])

async function openCompare(row: VersionItem) {
  compareVisible.value = true
  compareLoading.value = true
  compareRows.value = []
  compareTitle.value = `「${row.templateName}」${row.versionNo} 与当前模板对比`
  try {
    const [snapRes, curRes] = await Promise.all([
      getVersionSnapshot(row.id),
      getTemplateDetail(row.templateId),
    ])
    const snapFields = snapRes.data.snapshot?.fields ?? []
    const curFields = curRes.data.fields ?? []
    compareRows.value = buildDiff(snapFields, curFields)
  } catch (e) {
    ElMessage.error((e as Error).message || '对比失败')
  } finally {
    compareLoading.value = false
  }
}

function buildDiff(snapFields: SnapshotField[], curFields: TemplateField[]): DiffRow[] {
  const snapMap = new Map(snapFields.map((f) => [f.fieldName, f]))
  const curMap = new Map(curFields.map((f) => [f.fieldName, f]))
  const rows: DiffRow[] = []
  for (const [name, f] of curMap) {
    const s = snapMap.get(name)
    if (!s) {
      rows.push({ type: 'added', fieldName: name, detail: `新增字段（类型 ${f.fieldType}，${f.required === 1 ? '必填' : '选填'}）` })
    } else {
      const changes: string[] = []
      if (s.required !== f.required) changes.push(`必填 ${s.required === 1 ? '是' : '否'} → ${f.required === 1 ? '是' : '否'}`)
      if (s.fieldType !== f.fieldType) changes.push(`类型 ${s.fieldType} → ${f.fieldType}`)
      if ((s.formatRule ?? '') !== (f.formatRule ?? '')) changes.push('格式规则变更')
      if (changes.length) rows.push({ type: 'modified', fieldName: name, detail: changes.join('；') })
    }
  }
  for (const [name, s] of snapMap) {
    if (!curMap.has(name)) {
      rows.push({ type: 'removed', fieldName: name, detail: `已删除字段（原类型 ${s.fieldType}）` })
    }
  }
  return rows
}

function diffLabel(type: DiffRow['type']) {
  return type === 'added' ? '新增' : type === 'removed' ? '删除' : '变更'
}
function diffTagType(type: DiffRow['type']): 'success' | 'danger' | 'warning' {
  return type === 'added' ? 'success' : type === 'removed' ? 'danger' : 'warning'
}

// ============ 生成新版本（机构管理员/监管员专属） ============
const genVisible = ref(false)
const genLoading = ref(false)
const genTemplates = ref<TemplateItem[]>([])
const genForm = reactive({ templateId: undefined as number | undefined, changeSummary: '' })

async function openGenerate() {
  genVisible.value = true
  genForm.templateId = undefined
  genForm.changeSummary = ''
  const res = await getTemplatePage({ pageNum: 1, pageSize: 200 })
  genTemplates.value = res.data.list
}

async function submitGenerate() {
  if (!genForm.templateId) {
    ElMessage.warning('请选择模板')
    return
  }
  genLoading.value = true
  try {
    const res = await generateVersion({ templateId: genForm.templateId, changeSummary: genForm.changeSummary || undefined })
    ElMessage.success(`已生成新版本 ${res.data.versionNo}`)
    genVisible.value = false
    pageNum.value = 1
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '生成失败')
  } finally {
    genLoading.value = false
  }
}

// ============ 删除（机构管理员/监管员专属） ============
async function handleDelete(row: VersionItem) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.templateName}」的版本 ${row.versionNo} 吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteVersion(row.id)
    ElMessage.success('删除成功')
    pageNum.value = 1
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败')
  }
}

function formatTime(t?: string) {
  return t ? t.replace('T', ' ') : ''
}

onMounted(loadData)
</script>

<style scoped>
.version-container {
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
.snap-fields-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}
</style>
