import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
  withCredentials: true,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('info_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // ngrok 免费域名会给浏览器请求插入拦截提示页（ERR_NGROK_6024），
  // 带上该请求头即可直通后端，避免接口返回一段 HTML 而不是 JSON。
  config.headers['ngrok-skip-browser-warning'] = 'true'
  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data as { code?: number; msg?: string }
    if (res && typeof res.code === 'number' && res.code !== 200) {
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    return response.data
  },
  (error) => {
    const msg = error.response?.data?.msg || error.message || '网络异常'
    return Promise.reject(new Error(msg))
  },
)

export default request
