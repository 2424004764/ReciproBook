// API 工具模块，封装 Cloudflare Workers HTTP 请求
const DEV_API = 'http://127.0.0.1:8787/api'
const PROD_API = 'https://recipro-book.fologde.com/api'  // 实际部署域名

const BASE_URL = process.env.NODE_ENV === 'development' ? DEV_API : PROD_API

async function request(method, path, data = null) {
  const token = uni.getStorageSync('token')
  const header = { 'Content-Type': 'application/json' }
  if (token) header['Authorization'] = `Bearer ${token}`

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + path,
      method,
      data,
      header,
      success: (res) => {
        if (res.statusCode === 204) return resolve({ code: 0 })
        if (res.data.code === 0) return resolve(res.data)
        resolve(res.data)
      },
      fail: (err) => {
        console.error('API request failed:', method, path, err)
        reject(err)
      }
    })
  })
}

export const api = {
  // -- User --
  login(code, source = '') {
    return request('POST', '/user/login', { code, source })
  },

  // -- Records --
  getSummary() {
    return request('GET', '/records/summary')
  },
  getList({ page = 0, direction, type } = {}) {
    const parts = [`page=${page}`]
    if (direction && direction !== 'all') parts.push(`direction=${encodeURIComponent(direction)}`)
    if (type && type !== 'all') parts.push(`type=${encodeURIComponent(type)}`)
    return request('GET', `/records?${parts.join('&')}`)
  },
  getContactList() {
    return request('GET', '/records/contacts')
  },
  getByContact(contactName) {
    return request('GET', `/records/contact/${encodeURIComponent(contactName)}`)
  },
  search(keyword) {
    return request('GET', `/records/search?keyword=${encodeURIComponent(keyword)}`)
  },
  add(item) {
    return request('POST', '/records', item)
  },
  getOne(id) {
    return request('GET', `/records/${id}`)
  },
  update(item) {
    const { _id, ...body } = item
    return request('PUT', `/records/${_id}`, body)
  },
  remove(id) {
    return request('DELETE', `/records/${id}`)
  },
}
