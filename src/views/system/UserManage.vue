<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getUserPage,
  addUser,
  updateUser,
  deleteUser,
  changeUserStatus,
  getInstitutions,
  type UserItem,
  type Institution,
} from '@/api/user'

const userStore = useUserStore()

const loading = ref(false)
const list = ref<UserItem[]>([])
const total = ref(0)

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  username: '',
  institution: '',
})

const institutions = ref<Institution[]>([])

const roleOptions = [
  { value: 'REGULATOR', label: '监管员' },
  { value: 'INSTITUTION_ADMIN', label: '机构管理员' },
]

const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const formRef = ref<FormInstance>()
const form = reactive({
  id: undefined as number | undefined,
  username: '',
  password: '',
  role: 'INSTITUTION_ADMIN',
  institutionId: null as number | null,
  status: 1,
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [
    {
      validator: (_rule, value, callback) => {
        if (!form.id && !value) {
          callback(new Error('请输入密码'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

async function loadList() {
  loading.value = true
  try {
    const res = await getUserPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      username: query.username || undefined,
      institution: query.institution || undefined,
    })
    list.value = res.data.list
    total.value = res.data.total
  } catch (e) {
    ElMessage.error((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.pageNum = 1
  loadList()
}

function handleReset() {
  query.username = ''
  query.institution = ''
  query.pageNum = 1
  loadList()
}

function handleAdd() {
  dialogTitle.value = '新增用户'
  Object.assign(form, {
    id: undefined,
    username: '',
    password: '',
    role: 'INSTITUTION_ADMIN',
    institutionId: null,
    status: 1,
  })
  dialogVisible.value = true
}

function handleEdit(row: UserItem) {
  dialogTitle.value = '编辑用户'
  Object.assign(form, {
    id: row.id,
    username: row.username,
    password: '',
    role: row.role,
    institutionId: row.institutionId,
    status: row.status,
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  let valid = false
  try {
    await formRef.value.validate()
    valid = true
  } catch {
    valid = false
  }
  if (!valid) return

  try {
    if (form.id) {
      await updateUser({
        id: form.id,
        username: form.username,
        role: form.role,
        institutionId: form.institutionId,
        status: form.status,
      })
      ElMessage.success('编辑成功')
    } else {
      await addUser({
        username: form.username,
        password: form.password,
        role: form.role,
        institutionId: form.institutionId,
        status: form.status,
      })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  }
}

async function handleDelete(row: UserItem) {
  try {
    await ElMessageBox.confirm(`确认删除用户「${row.username}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败')
  }
}

async function handleChangeStatus(row: UserItem) {
  const next = row.status === 1 ? 0 : 1
  try {
    await changeUserStatus(row.id, next)
    ElMessage.success(next === 1 ? '已启用' : '已禁用')
    loadList()
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  }
}

onMounted(async () => {
  loadList()
  try {
    const res = await getInstitutions()
    institutions.value = res.data
  } catch {
    // 机构列表加载失败不阻断表格展示
  }
})
</script>

<template>
  <el-card>
    <template #header>
      <div class="toolbar">
        <span>用户管理</span>
        <el-button type="primary" :icon="Plus" :disabled="!userStore.canOperate" @click="handleAdd">
          新增
        </el-button>
      </div>
    </template>

    <div class="search-bar">
      <el-input
        v-model="query.username"
        placeholder="用户名"
        clearable
        style="width: 200px"
        @keyup.enter="handleQuery"
      />
      <el-input
        v-model="query.institution"
        placeholder="所属机构"
        clearable
        style="width: 200px"
        @keyup.enter="handleQuery"
      />
      <el-button type="primary" :icon="Search" :disabled="!userStore.canOperate" @click="handleQuery">
        查询
      </el-button>
      <el-button :icon="Refresh" @click="handleReset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="roleLabel" label="角色" />
      <el-table-column prop="institution" label="所属机构" />
      <el-table-column prop="status" label="状态">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="!userStore.canOperate" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button
            link
            :type="row.status === 1 ? 'warning' : 'success'"
            :disabled="!userStore.canOperate"
            @click="handleChangeStatus(row)"
          >
            {{ row.status === 1 ? '禁用' : '启用' }}
          </el-button>
          <el-button link type="danger" :disabled="!userStore.canOperate" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadList"
        @current-change="loadList"
      />
    </div>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="账号" prop="username">
        <el-input v-model="form.username" placeholder="请输入账号" />
      </el-form-item>
      <el-form-item v-if="!form.id" label="密码" prop="password">
        <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
      </el-form-item>
      <el-form-item label="角色" prop="role">
        <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%">
          <el-option v-for="r in roleOptions" :key="r.value" :label="r.label" :value="r.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属机构">
        <el-select v-model="form.institutionId" placeholder="请选择机构" clearable style="width: 100%">
          <el-option v-for="i in institutions" :key="i.id" :label="i.orgName" :value="i.id" />
        </el-select>
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
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
