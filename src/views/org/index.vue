<template>
  <div class="org-container">
    <div class="page-header">
      <h2>机构管理</h2>
    </div>

    <el-tabs v-model="activeTab" class="org-tabs">
      <!-- ============ Tab 1：机构列表 ============ -->
      <el-tab-pane label="机构列表" name="list">
        <el-card class="search-card">
          <el-form :model="queryForm" inline>
            <el-form-item label="机构名称">
              <el-input v-model="queryForm.orgName" placeholder="请输入机构名称" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleQuery">查询</el-button>
              <el-button @click="resetQuery">重置</el-button>
              <el-button type="success" :disabled="!canManage" @click="openAdd">新增机构</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="table-card" style="margin-top:16px">
          <el-table v-loading="loading" :data="tableData" border stripe>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="orgName" label="机构名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="creditCode" label="统一社会信用代码" min-width="180" />
            <el-table-column prop="contactPerson" label="联系人" width="110" />
            <el-table-column prop="phone" label="联系电话" min-width="130" />
            <el-table-column prop="address" label="地址" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="scope">
                <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                  {{ scope.row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="scope">
                <el-button size="small" type="primary" :disabled="!canManage" @click="openEdit(scope.row)">编辑</el-button>
                <el-button size="small" type="danger" :disabled="!canManage" @click="handleDelete(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
              v-model:current-page="pageNum"
              v-model:page-size="pageSize"
              :total="total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              style="margin-top:16px;justify-content:flex-end;display:flex"
              @current-change="loadData"
              @size-change="handleSizeChange"
          />
        </el-card>
      </el-tab-pane>

      <!-- ============ Tab 2：入驻申请（仅监管员） ============ -->
      <el-tab-pane v-if="isSupervisor" name="apply">
        <template #label>
          <span class="apply-tab-label">
            入驻申请
            <el-badge v-if="pendingCount > 0" :value="pendingCount" class="apply-badge" />
          </span>
        </template>

        <el-card class="search-card">
          <el-form :model="applyQuery" inline>
            <el-form-item label="状态">
              <el-select v-model="applyQuery.status" placeholder="全部" clearable style="width: 140px" @change="handleApplyQuery">
                <el-option label="待审核" :value="0" />
                <el-option label="已通过" :value="1" />
                <el-option label="已拒绝" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleApplyQuery">查询</el-button>
              <el-button @click="resetApplyQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="table-card" style="margin-top:16px">
          <el-table v-loading="applyLoading" :data="applyList" border stripe>
            <el-table-column prop="orgName" label="机构名称" min-width="160" show-overflow-tooltip />
            <el-table-column label="统一社会信用代码" min-width="180">
              <template #default="scope">
                <el-tag v-if="!scope.row.creditCode" type="info" effect="plain">待生成</el-tag>
                <span v-else>{{ scope.row.creditCode }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="legalPerson" label="法人" width="100" />
            <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
            <el-table-column prop="createTime" label="申请时间" width="170" />
            <el-table-column label="状态" width="100" align="center">
              <template #default="scope">
                <el-tag :type="APPLY_STATUS_MAP[scope.row.status]?.type ?? 'info'">
                  {{ APPLY_STATUS_MAP[scope.row.status]?.label ?? '未知' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="scope">
                <template v-if="scope.row.status === 0">
                  <el-button size="small" type="success" @click="handleApprove(scope.row)">同意</el-button>
                  <el-button size="small" type="danger" @click="openReject(scope.row)">拒绝</el-button>
                </template>
                <el-text v-else-if="scope.row.status === 2" type="info" size="small">
                  {{ scope.row.reason || '已拒绝' }}
                </el-text>
                <el-text v-else type="success" size="small">已生成账号</el-text>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
              v-model:current-page="applyPageNum"
              v-model:page-size="applyPageSize"
              :total="applyTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              style="margin-top:16px;justify-content:flex-end;display:flex"
              @current-change="loadApplyList"
              @size-change="handleApplySizeChange"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑机构弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑机构' : '新增机构'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="机构名称" prop="orgName">
          <el-input v-model="form.orgName" placeholder="请输入机构名称" />
        </el-form-item>
        <el-form-item label="统一社会信用代码">
          <el-input v-model="form.creditCode" disabled :placeholder="isEdit ? '' : '提交后由后端自动生成'" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contactPerson" disabled :placeholder="isEdit ? '' : '提交后由后端自动生成'" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话（手机11位或座机带区号）" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 拒绝原因弹窗 -->
    <el-dialog v-model="rejectVisible" title="拒绝入驻申请" width="480px">
      <el-form label-width="80px">
        <el-form-item label="机构">
          <span>{{ rejectTarget?.orgName }}</span>
        </el-form-item>
        <el-form-item label="拒绝原因" required>
          <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写拒绝原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="rejecting" @click="submitReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { addOrg, deleteOrg, getOrgPage, updateOrg, type OrgItem } from '@/api/org'
import { approveApply, getApplyList, rejectApply, type OrgApplyItem } from '@/api/orgApply'

const userStore = useUserStore()

// 仅监管员（REGULATOR -> supervisor）可新增/编辑/删除 + 审核；游客、机构管理员仅查看
const canManage = computed(() => userStore.role === 'supervisor')
const isSupervisor = computed(() => userStore.role === 'supervisor')

const APPLY_STATUS_MAP: Record<number, { label: string; type: 'warning' | 'success' | 'danger' | 'info' }> = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' },
}

// ============ 机构列表 ============
const loading = ref(false)
const queryForm = reactive({ orgName: '' })
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref<OrgItem[]>([])

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  id: undefined as number | undefined,
  orgName: '',
  creditCode: '',
  contactPerson: '',
  phone: '',
  address: '',
  status: 1,
})

const rules: FormRules = {
  orgName: [{ required: true, message: '机构名称不能为空', trigger: 'blur' }],
  phone: [
    { required: true, message: '联系电话不能为空', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const digits = String(value ?? '').replace(/[\s-]/g, '')
        if (!/^\d{7,12}$/.test(digits)) {
          callback(new Error('联系电话需 7~12 位数字'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

async function loadData() {
  if (!userStore.isLoggedIn) {
    tableData.value = SAMPLE_DATA
    total.value = SAMPLE_DATA.length
    return
  }
  loading.value = true
  try {
    const res = await getOrgPage({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      orgName: queryForm.orgName || undefined,
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
  queryForm.orgName = ''
  pageNum.value = 1
  loadData()
}

function openAdd() {
  if (!canManage.value) return
  isEdit.value = false
  Object.assign(form, {
    id: undefined,
    orgName: '',
    creditCode: '',
    contactPerson: '',
    phone: '',
    address: '',
    status: 1,
  })
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

function openEdit(row: OrgItem) {
  if (!canManage.value) return
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    orgName: row.orgName,
    creditCode: row.creditCode,
    contactPerson: row.contactPerson,
    phone: row.phone,
    address: row.address ?? '',
    status: row.status,
  })
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  try {
    if (isEdit.value) {
      await updateOrg({
        id: form.id,
        orgName: form.orgName,
        phone: form.phone,
        address: form.address,
        status: form.status,
      })
      ElMessage.success('修改成功')
    } else {
      await addOrg({
        orgName: form.orgName,
        phone: form.phone,
        address: form.address,
        status: form.status,
      })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '提交失败，请检查')
  }
}

async function handleDelete(row: OrgItem) {
  if (!canManage.value) return
  try {
    await ElMessageBox.confirm(`确认删除机构「${row.orgName}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteOrg(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败')
  }
}

// ============ 入驻申请审核 ============
const activeTab = ref('list')
const applyLoading = ref(false)
const applyList = ref<OrgApplyItem[]>([])
const applyTotal = ref(0)
const applyPageNum = ref(1)
const applyPageSize = ref(10)
const applyQuery = reactive({ status: undefined as number | undefined })
const pendingCount = ref(0)

const rejectVisible = ref(false)
const rejecting = ref(false)
const rejectTarget = ref<OrgApplyItem | null>(null)
const rejectReason = ref('')

async function loadApplyList() {
  if (!isSupervisor.value) return
  applyLoading.value = true
  try {
    const res = await getApplyList({
      pageNum: applyPageNum.value,
      pageSize: applyPageSize.value,
      status: applyQuery.status,
    })
    applyList.value = res.data.list
    applyTotal.value = res.data.total
  } catch (e) {
    ElMessage.error((e as Error).message || '加载申请列表失败')
  } finally {
    applyLoading.value = false
  }
}

async function loadPendingCount() {
  if (!isSupervisor.value) return
  try {
    const res = await getApplyList({ pageNum: 1, pageSize: 1, status: 0 })
    pendingCount.value = res.data.total
  } catch {
    // 忽略
  }
}

function handleApplyQuery() {
  applyPageNum.value = 1
  loadApplyList()
}

function handleApplySizeChange() {
  applyPageNum.value = 1
  loadApplyList()
}

function resetApplyQuery() {
  applyQuery.status = undefined
  applyPageNum.value = 1
  loadApplyList()
}

async function handleApprove(row: OrgApplyItem) {
  try {
    await ElMessageBox.confirm(
      `确认通过「${row.orgName}」的入驻申请？通过后将自动创建机构与机构管理员账号。`,
      '审核通过确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    const res = await approveApply(row.id)
    const r = res.data
    await ElMessageBox.alert(
      `机构「${r.orgName}」已创建成功！\n统一社会信用代码：${r.creditCode}\n机构管理员账号：${r.username}\n初始密码：${r.password}`,
      '审核通过',
      { type: 'success', confirmButtonText: '知道了' },
    )
    loadApplyList()
    loadPendingCount()
    loadData()
  } catch (e) {
    ElMessage.error((e as Error).message || '审核操作失败')
  }
}

function openReject(row: OrgApplyItem) {
  rejectTarget.value = row
  rejectReason.value = ''
  rejectVisible.value = true
}

async function submitReject() {
  if (!rejectTarget.value) return
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写拒绝原因')
    return
  }
  rejecting.value = true
  try {
    await rejectApply(rejectTarget.value.id, rejectReason.value.trim())
    ElMessage.success('已拒绝该申请')
    rejectVisible.value = false
    loadApplyList()
    loadPendingCount()
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  } finally {
    rejecting.value = false
  }
}

const SAMPLE_DATA: OrgItem[] = [
  { id: 1, orgName: '监管总局', creditCode: 'ABCD00000000000001', contactPerson: '100001', phone: '010-12345678', address: '北京市西城区金融大街', status: 1 },
  { id: 2, orgName: '示例机构A', creditCode: 'ABCD00000000000002', contactPerson: '100002', phone: '13800000002', address: '上海市浦东新区', status: 1 },
]

onMounted(() => {
  loadData()
  loadApplyList()
  loadPendingCount()
})
</script>

<style scoped>
.org-container {
  padding: 16px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}
.page-header h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #1f2937;
}
.search-card, .table-card {
  border-radius: 8px;
}
.org-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}
.apply-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.apply-badge {
  margin-left: 2px;
}
</style>
