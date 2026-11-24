<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getLogPage, type LogItem } from '@/api/log'

const userStore = useUserStore()

const loading = ref(false)
const list = ref<LogItem[]>([])
const total = ref(0)

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  username: '',
  type: '',
})

const typeOptions = [
  { value: 'LOGIN', label: '登录' },
  { value: 'ADD_USER', label: '新增用户' },
  { value: 'EDIT_USER', label: '编辑用户' },
  { value: 'DELETE_USER', label: '删除用户' },
  { value: 'CHANGE_PWD', label: '修改密码' },
  { value: 'ADD_INST', label: '新增机构' },
  { value: 'EDIT_INST', label: '编辑机构' },
  { value: 'DELETE_INST', label: '删除机构' },
  { value: 'EXPORT', label: '导出' },
  { value: 'QUERY', label: '查询' },
  { value: 'ADD_TEMPLATE', label: '新增模板' },
  { value: 'EDIT_TEMPLATE', label: '编辑模板' },
  { value: 'DELETE_TEMPLATE', label: '删除模板' },
  { value: 'TEMPLATE_STATUS', label: '模板启停' },
  { value: 'EXECUTE_CHECK', label: '执行检查' },
  { value: 'DELETE_CHECK', label: '删除检查' },
  { value: 'GENERATE_VERSION', label: '生成版本' },
  { value: 'DELETE_VERSION', label: '删除版本' },
]

async function loadData() {
  loading.value = true
  try {
    const res = await getLogPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      username: query.username || undefined,
      type: query.type || undefined,
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
  loadData()
}

function handleReset() {
  query.username = ''
  query.type = ''
  query.pageNum = 1
  loadData()
}

onMounted(loadData)
</script>

<template>
  <el-card>
    <template #header>
      <div class="toolbar">
        <span>操作日志</span>
      </div>
    </template>

    <div class="search-bar">
      <el-input
        v-model="query.username"
        placeholder="操作人"
        clearable
        style="width: 200px"
        @keyup.enter="handleQuery"
      />
      <el-select v-model="query.type" placeholder="操作类型" clearable style="width: 200px">
        <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-button type="primary" :icon="Search" :disabled="!userStore.canOperate" @click="handleQuery">
        查询
      </el-button>
      <el-button :icon="Refresh" @click="handleReset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="username" label="操作人" />
      <el-table-column prop="typeLabel" label="操作类型" />
      <el-table-column prop="createTime" label="时间" />
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>
  </el-card>
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
