import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/registerOrg.vue'),
    meta: { title: '机构入驻申请' },
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/home/index.vue'),
        meta: { title: '系统首页' },
      },
      {
        path: 'system',
        redirect: '/system/user',
      },
      {
        path: 'system/user',
        name: 'system-user',
        component: () => import('@/views/system/UserManage.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'system/role',
        name: 'system-role',
        component: () => import('@/views/system/RolePermission.vue'),
        meta: { title: '角色权限说明' },
      },
      {
        path: 'system/password',
        name: 'system-password',
        component: () => import('@/views/system/ChangePassword.vue'),
        meta: { title: '修改密码' },
      },
      {
        path: 'system/log',
        name: 'system-log',
        component: () => import('@/views/system/OperationLog.vue'),
        meta: { title: '操作日志' },
      },
      {
        path: 'org',
        name: 'org',
        component: () => import('@/views/org/index.vue'),
        meta: { title: '机构管理' },
      },
      {
        path: 'template',
        name: 'template',
        component: () => import('@/views/superviseTemplate/index.vue'),
        meta: { title: '模板管理' },
      },
      {
        path: 'templateDefine',
        name: 'TemplateDefine',
        component: () => import('@/views/superviseTemplate/index.vue'),
        meta: {title: '模板定义'}
      },
      {
        path: 'checkScore',
        name: 'checkScore',
        component: () => import('@/views/checkScore/index.vue'),
        meta: { title: '规则配置' }
      },
      {
        path: 'templateversion',
        name: 'templateversion',
        component: () => import('@/views/templateVersion/index.vue'),
        meta: { title: '版本管理' }
      },



      {
        path: 'import',
        name: 'import',
        component: () => import('@/views/disclosureImport/index.vue'),
        meta: { title: '信息披露导入' },
      },
      {
        path: 'engine',
        name: 'engine',
        component: () => import('@/views/engine/index.vue'),
        meta: { title: '合规检查引擎', requiresAuth: true },
      },
      {
        path: 'result',
        name: 'result',
        component: () => import('@/views/report/index.vue'),
        meta: { title: '合规结果输出', requiresAuth: true },
      },
      {
        path: 'supervision',
        name: 'supervision',
        component: () => import('@/views/supervision/index.vue'),
        meta: { title: '监管视图', requiresAuth: true, roles: ['supervisor'] },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ========== 这里追加你的互金合规路由 ==========
    {
      path: '/ifCompliance',
      component: Layout,
      redirect: '/ifCompliance/check',
      name: 'IfCompliance',
      meta: { title: '互金合规检查', icon: 'check' },
      children: [
        {
          path: 'check',
          component: () => import('@/views/ifCompliance/ComplianceCheck.vue'),
          name: 'ComplianceCheck',
          meta: { title: '合规检查' }
        },
        {
          path: 'rank',
          component: () => import('@/views/ifCompliance/OrgRank.vue'),
          name: 'OrgRank',
          meta: { title: '机构合规排名', roles:['admin'] }
        }
      ]
    },
    ...routes,
  ],
})

// 路由守卫：拦截需要登录才能访问的路由，未登录（无 token）跳转登录页
// 说明：模板定义页本身允许游客只读浏览（不标记 requiresAuth），
// 其「新增/编辑/删除/启停」等写操作由页面内 isAdmin + 后端 401/403 双重拦截；
// 若后续将模板页改为需登录才可访问，只需在 meta 中追加 requiresAuth: true 即可。
router.beforeEach((to) => {
  const token = localStorage.getItem('info_token')
  if (to.meta.requiresAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // 角色校验：meta.roles 指定可访问角色（如监管视图仅 supervisor）
  const roles = to.meta.roles as string[] | undefined
  if (roles && roles.length) {
    // 仅对本系统真实角色做守卫；历史路由可能使用 'admin' 等旧值，忽略以免误伤
    const realRoles: string[] = roles.filter((r) => r === 'supervisor' || r === 'orgAdmin')
    if (realRoles.length) {
      let role = 'guest'
      const userStr = localStorage.getItem('info_user')
      if (userStr) {
        try {
          role = (JSON.parse(userStr) as { role?: string }).role ?? 'guest'
        } catch {
          role = 'guest'
        }
      }
      if (!realRoles.includes(role)) {
        return { path: '/', query: { denied: realRoles[0] } }
      }
    }
  }
})

router.afterEach((to) => {
  const base = '互联网金融机构信息披露合规检查系统'
  document.title = to.meta.title ? `${to.meta.title} - ${base}` : base
})

export default router
