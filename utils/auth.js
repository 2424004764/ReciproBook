import { api } from './api'

const APP_SOURCE = 'recipro-book'

let loginPromise = null

export async function ensureLogin() {
  const cached = uni.getStorageSync('token')
  if (cached) return cached

  if (loginPromise) return loginPromise

  loginPromise = (async () => {
    try {
      const loginRes = await uni.login({ provider: 'weixin' })
      const res = await api.login(loginRes.code, APP_SOURCE)
      if (res.code === 0) {
        uni.setStorageSync('token', res.data.token)
        return res.data.token
      } else {
        throw new Error(res.msg || '登录失败')
      }
    } finally {
      loginPromise = null
    }
  })()

  return loginPromise
}
