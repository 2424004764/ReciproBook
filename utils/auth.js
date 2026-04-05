// 全局登录状态管理，确保登录完成后再执行业务请求
const userCo = uniCloud.importObject('user-co', { customUI: true })

let loginPromise = null

export async function ensureLogin() {
  // 已有缓存直接注入，无需再请求
  const cached = uni.getStorageSync('openid')
  if (cached) {
    uniCloud.setCustomClientInfo({ openid: cached })
    return cached
  }

  // 防止并发重复登录
  if (loginPromise) return loginPromise

  loginPromise = (async () => {
    try {
      const loginRes = await uni.login({ provider: 'weixin' })
      const res = await userCo.login(loginRes.code)
      if (res.code === 0) {
        uni.setStorageSync('openid', res.openid)
        uniCloud.setCustomClientInfo({ openid: res.openid })
        return res.openid
      } else {
        throw new Error(res.msg || '登录失败')
      }
    } finally {
      loginPromise = null
    }
  })()

  return loginPromise
}
