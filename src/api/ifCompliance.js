import request from '@/api/request'

// 执行合规检查
export function runCheck(data, orgId, taskName) {
    return request({
        url: '/ifCompliance/runCheck',
        method: 'post',
        data,
        params: { orgId, taskName }
    })
}

// 获取扣分明细
export function getDetail(taskId) {
    return request({
        url: '/ifCompliance/getDetail',
        method: 'get',
        params: { taskId }
    })
}

// 导出报告
export function exportReport(taskId) {
    return request({
        url: '/ifCompliance/export',
        method: 'get',
        params: { taskId }
    })
}

// 获取机构排名
export function getRankList() {
    return request({
        url: '/ifCompliance/rank',
        method: 'get'
    })
}