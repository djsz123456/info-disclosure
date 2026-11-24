<template>
  <div class="template-container">
    <!-- 顶部标题栏：标题 + 说明 + 新增按钮（机构管理员/监管员专属） -->
    <div class="page-header">
      <div class="header-left">
        <h2>模板定义</h2>
        <p class="header-desc">配置信息披露模板及其动态必填字段与格式规则，作为合规检查的产出依据</p>
      </div>
      <el-button v-if="isAdmin" type="primary" :icon="Plus" @click="openAdd">新增模板</el-button>
    </div>

    <!-- 只读提示：游客 / 非机构管理员 -->
    <el-alert
      v-if="!isAdmin"
      class="readonly-alert"
      type="info"
      show-icon
      :closable="false"
      :title="isLoggedIn ? '当前账号为只读权限，仅可查看模板' : '游客模式：仅可查看模板，如需操作请先登录'" />

    <!-- 筛选卡片 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="queryForm" inline>
        <el-form-item label="模板名称">
          <el-input v-model="queryForm.name" placeholder="请输入模板名称" clearable style="width: 200px"
                    @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="产出范围">
          <el-select v-model="queryForm.outputScope" placeholder="全部" clearable filterable style="width: 180px">
            <el-option v-for="s in OUTPUT_SCOPE_OPTIONS" :key="s" :label="s" :value="s" />
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
        <el-table-column prop="code" label="模板编码" width="200" show-overflow-tooltip />
        <el-table-column prop="name" label="模板名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="outputScope" label="产出范围" width="140" />
        <el-table-column label="必填字段数" width="120" align="center">
          <template #default="scope">
            <el-tag type="warning" effect="light">{{ scope.row.requiredFieldCount }} 项</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止时间" width="120" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
              {{ scope.row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openView(scope.row)">查看</el-button>
            <!-- 以下修改类操作：机构管理员/监管员专属 -->
            <template v-if="isAdmin">
              <el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button>
              <el-button v-if="scope.row.status === 1" link type="warning" @click="toggleStatus(scope.row)">停用</el-button>
              <el-button v-else link type="success" @click="toggleStatus(scope.row)">启用</el-button>
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

    <!-- 新增/编辑弹窗（核心：基础信息 + 动态字段配置） -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑模板' : '新增模板'" width="760px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-divider content-position="left">基础信息</el-divider>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="模板名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入模板名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产出范围" prop="outputScope">
              <el-select v-model="form.outputScope" placeholder="请选择产出范围" filterable allow-create style="width: 100%">
                <el-option v-for="s in OUTPUT_SCOPE_OPTIONS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="截止时间" prop="deadline">
              <el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD"
                              placeholder="请选择截止日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio :value="1">启用</el-radio>
                <el-radio :value="0">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          动态字段配置
          <span class="divider-tip">（至少配置 1 项）</span>
        </el-divider>

        <div class="field-panel">
          <div class="field-panel-toolbar">
            <span class="field-panel-title">字段列表</span>
            <el-button type="primary" link :icon="Plus" @click="addField">添加字段</el-button>
          </div>

          <div v-for="(f, idx) in form.fields" :key="idx" class="field-row">
            <span class="field-index">{{ idx + 1 }}</span>
            <el-input v-model="f.fieldName" placeholder="字段名，如 paid_capital" class="field-name" />
            <el-select v-model="f.fieldType" placeholder="字段类型" class="field-type">
              <el-option v-for="t in FIELD_TYPE_OPTIONS" :key="t" :label="t" :value="t" />
            </el-select>
            <el-input v-model="f.formatRule" placeholder="格式规则/正则（可选）" class="field-rule" />
            <div class="field-required">
              <span>必填</span>
              <el-switch v-model="f.required" :active-value="1" :inactive-value="0" />
            </div>
            <el-button link type="danger" :icon="Delete" @click="removeField(idx)" />
          </div>

          <el-empty v-if="!form.fields.length" description="尚未配置字段，请点击「添加字段」" :image-size="60" />
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看弹窗（只读，游客/非管理员也可看） -->
    <el-dialog v-model="viewVisible" title="模板详情" width="680px">
      <div v-loading="viewLoading">
        <el-descriptions v-if="viewData" :column="2" border>
          <el-descriptions-item label="模板编码">{{ viewData.code }}</el-descriptions-item>
          <el-descriptions-item label="模板名称">{{ viewData.name }}</el-descriptions-item>
          <el-descriptions-item label="产出范围">{{ viewData.outputScope }}</el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ viewData.deadline }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="viewData.status === 1 ? 'success' : 'info'" size="small">
              {{ viewData.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="必填字段数">{{ viewData.requiredFieldCount }} 项</el-descriptions-item>
        </el-descriptions>

        <div class="view-fields-title">字段明细</div>
        <el-table :data="viewData?.fields ?? []" border size="small">
          <el-table-column prop="sort" label="排序" width="60" align="center" />
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
        <el-button type="primary" @click="viewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  addTemplate,
  changeTemplateStatus,
  deleteTemplate,
  getTemplateDetail,
  getTemplatePage,
  updateTemplate,
  type TemplateField,
  type TemplateItem,
} from '@/api/superviseTemplate'

const userStore = useUserStore()

// ============ 权限判断（示意） ============
// 可操作角色：机构管理员(INSTITUTION_ADMIN → orgAdmin) 或 监管员(REGULATOR → supervisor)
const isAdmin = computed(() => userStore.role === 'orgAdmin' || userStore.role === 'supervisor')
const isLoggedIn = computed(() => userStore.isLoggedIn)

// ============ 常量选项 ============
const OUTPUT_SCOPE_OPTIONS = ['月度披露报告', '季度披露报告', '年度披露报告', '实时披露', '临时披露公告']
const FIELD_TYPE_OPTIONS = [
  'TEXT', 'NUMBER', 'DATE', 'DATETIME', 'PERCENT', 'CURRENCY',
  'PHONE', 'EMAIL', 'URL', 'ENUM', 'REGEX', 'BOOLEAN',
]

// ============ 列表 ============
const loading = ref(false)
const tableData = ref<TemplateItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const queryForm = reactive({
  name: '',
  status: undefined as number | undefined,
  outputScope: '',
})

async function loadData() {
  loading.value = true
  try {
    const res = await getTemplatePage({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      name: queryForm.name || undefined,
      status: queryForm.status,
      outputScope: queryForm.outputScope || undefined,
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
  queryForm.name = ''
  queryForm.status = undefined
  queryForm.outputScope = ''
  pageNum.value = 1
  loadData()
}

// ============ 新增/编辑 ============
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  id: undefined as number | undefined,
  name: '',
  outputScope: '',
  deadline: '',
  status: 1,
  fields: [] as TemplateField[],
})

const rules: FormRules = {
  name: [{ required: true, message: '模板名称不能为空', trigger: 'blur' }],
  outputScope: [{ required: true, message: '产出范围不能为空', trigger: 'change' }],
  deadline: [{ required: true, message: '截止时间不能为空', trigger: 'change' }],
}

function addField() {
  form.fields.push({ fieldName: '', required: 0, fieldType: '', formatRule: '' })
}

function removeField(idx: number) {
  form.fields.splice(idx, 1)
}

function openAdd() {
  Object.assign(form, { id: undefined, name: '', outputScope: '', deadline: '', status: 1, fields: [] })
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

async function openEdit(row: TemplateItem) {
  try {
    const res = await getTemplateDetail(row.id)
    const d = res.data
    Object.assign(form, {
      id: d.id,
      name: d.name,
      outputScope: d.outputScope,
      deadline: d.deadline,
      status: d.status,
      fields: (d.fields ?? []).map((f) => ({
        fieldName: f.fieldName,
        required: f.required,
        fieldType: f.fieldType,
        formatRule: f.formatRule ?? '',
        sort: f.sort,
      })),
    })
    formRef.value?.clearValidate()
    dialogVisible.value = true
  } catch (e) {
    ElMessage.error((e as Error).message || '加载模板详情失败')
  }
}

async function submitForm() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  // 动态字段校验：至少 1 项，且每项字段名/类型必填
  if (!form.fields.length) {
    ElMessage.warning('请至少配置一个字段')
    return
  }
  for (let i = 0; i < form.fields.length; i++) {
    const f = form.fields[i]
    if (!f) continue
    if (!f.fieldName?.trim()) {
      ElMessage.warning(`第 ${i + 1} 个字段的「字段名」不能为空`)
      return
    }
    if (!f.fieldType?.trim()) {
      ElMessage.warning(`第 ${i + 1} 个字段的「字段类型」不能为空`)
      return
    }
  }

  submitting.value = true
  try {
    const payload = {
      ...(form.id ? { id: form.id } : {}),
      name: form.name,
      outputScope: form.outputScope,
      deadline: form.deadline,
      status: form.status,
      fields: form.fields.map((f, i) => ({
        fieldName: f.fieldName,
        required: f.required,
        fieldType: f.fieldType,
        formatRule: f.formatRule || undefined,
        sort: i + 1,
      })),
    }
    if (form.id) {
      await updateTemplate(payload)
      ElMessage.success('修改成功')
    } else {
      await addTemplate(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    pageNum.value = 1
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '提交失败')
  } finally {
    submitting.value = false
  }
}

// ============ 查看（只读） ============
const viewVisible = ref(false)
const viewLoading = ref(false)
const viewData = ref<TemplateItem | null>(null)

async function openView(row: TemplateItem) {
  viewVisible.value = true
  viewLoading.value = true
  viewData.value = null
  try {
    const res = await getTemplateDetail(row.id)
    viewData.value = res.data
  } catch (e) {
    ElMessage.error((e as Error).message || '加载详情失败')
  } finally {
    viewLoading.value = false
  }
}

// ============ 启用/停用 & 删除（机构管理员/监管员专属） ============
async function toggleStatus(row: TemplateItem) {
  const next = row.status === 1 ? 0 : 1
  const actionText = next === 0 ? '停用' : '启用'
  try {
    await ElMessageBox.confirm(`确认${actionText}模板「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await changeTemplateStatus(row.id, next)
    ElMessage.success(`${actionText}成功`)
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  }
}

async function handleDelete(row: TemplateItem) {
  try {
    await ElMessageBox.confirm(`确认删除模板「${row.name}」吗？其字段配置将一并删除。`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteTemplate(row.id)
    ElMessage.success('删除成功')
    pageNum.value = 1
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败')
  }
}

onMounted(loadData)
</script>

<style scoped>
.template-container {
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

.filter-card,
.table-card {
  border-radius: 8px;
}
.table-card {
  margin-top: 16px;
}

.readonly-alert {
  margin-bottom: 16px;
  border-radius: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.divider-tip {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

/* 动态字段面板 */
.field-panel {
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  padding: 12px;
  background-color: #fafafa;
}
.field-panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.field-panel-title {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 8px;
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.field-index {
  flex: none;
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  font-size: 12px;
  color: #fff;
  background-color: #409eff;
  border-radius: 50%;
}
.field-name {
  width: 180px;
}
.field-type {
  width: 120px;
}
.field-rule {
  flex: 1;
}
.field-required {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.view-fields-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}
</style>
