<script setup lang="ts">
interface RoleRow {
  role: string
  scope: string
  modules: string
  actions: string
}

const roles: RoleRow[] = [
  {
    role: '监管员',
    scope: '全部机构',
    modules: '全部模块',
    actions: '全部操作（新增 / 编辑 / 删除 / 导入 / 导出）',
  },
  {
    role: '机构管理员',
    scope: '本机构',
    modules: '本机构相关内容',
    actions: '本机构范围内的新增 / 编辑 / 删除',
  },
  {
    role: '游客（未登录）',
    scope: '无',
    modules: '仅浏览页面结构与示例数据',
    actions: '无（全部只读，操作按钮禁用）',
  },
]
</script>

<template>
  <div class="role">
    <el-card>
      <template #header>角色说明</template>
      <el-table :data="roles" border>
        <el-table-column prop="role" label="角色" width="160" />
        <el-table-column prop="scope" label="数据范围" />
        <el-table-column prop="modules" label="可访问模块" />
        <el-table-column prop="actions" label="可执行操作" />
      </el-table>
    </el-card>

    <el-card>
      <template #header>权限说明</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="登录状态">
          系统允许未登录访问，未登录时以「游客」身份浏览，所有操作按钮禁用。
        </el-descriptions-item>
        <el-descriptions-item label="按钮禁用规则">
          所有新增 / 编辑 / 删除 / 导入 / 导出 / 查询等操作按钮，均通过 store 中的
          <el-tag size="small">canOperate</el-tag> 控制，未登录时统一禁用。
        </el-descriptions-item>
        <el-descriptions-item label="角色权限（前端展示）">
          监管员可查看全部模块；机构管理员仅查看本机构相关内容；本课设仅做前端展示，不做后端鉴权。
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped>
.role {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
