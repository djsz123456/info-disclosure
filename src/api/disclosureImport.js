import request from './request'

/**
 * 信息披露批量导入模块 API
 * 后端前缀：/api/disclosure/import（request 已带 /api 与 Authorization）
 */

/** 下载 Excel 模板（登录） */
export function downloadTemplate(templateId) {
  return request({
    url: '/disclosure/import/template/download',
    method: 'get',
    params: { templateId },
    responseType: 'blob',
  })
}

/** 上传解析预览（登录） */
export function parseImport(templateId, file) {
  const fd = new FormData()
  fd.append('file', file)
  return request({
    url: '/disclosure/import/parse',
    method: 'post',
    data: fd,
    params: { templateId },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 确认导入成功数据（机构管理员/监管员） */
export function confirmImport(previewToken) {
  return request({
    url: '/disclosure/import/confirm',
    method: 'post',
    data: { previewToken },
  })
}

/** 导入批次历史（登录） */
export function getImportHistory(params) {
  return request({
    url: '/disclosure/import/history',
    method: 'get',
    params,
  })
}

/** 批次明细（登录） */
export function getImportDetails(id) {
  return request({
    url: `/disclosure/import/history/${id}/details`,
    method: 'get',
  })
}

/** 导出批次错误报告（机构管理员/监管员） */
export function downloadErrorReport(id) {
  return request({
    url: `/disclosure/import/history/${id}/error-report`,
    method: 'get',
    responseType: 'blob',
  })
}

/** 导出预览（未确认导入）错误报告（机构管理员/监管员） */
export function downloadPreviewErrorReport(previewToken) {
  return request({
    url: '/disclosure/import/error-report/preview',
    method: 'get',
    params: { previewToken },
    responseType: 'blob',
  })
}

/** 机构列表（监管员筛选历史用；接口 /api/system/institution/list 需监管员） */
export function getInstitutionList() {
  return request({
    url: '/system/institution/list',
    method: 'get',
  })
}
