// 云对象：人情记录管理
const db = uniCloud.database()
const col = db.collection('rq_records')
const PAGE_SIZE = 20

module.exports = {
  _before() {
    const clientInfo = this.getClientInfo()
    this.openid = clientInfo.openid
    if (!this.openid) throw new Error('请先登录')
  },

  // 获取统计数据（收入/支出总额）
  async getSummary() {
    const res = await col.where({ _openid: this.openid }).get()
    const records = res.data
    let totalIn = 0   // 收到的（别人给我）
    let totalOut = 0  // 送出的（我给别人）
    records.forEach(r => {
      if (r.direction === 'in') totalIn += r.amount || 0
      else totalOut += r.amount || 0
    })
    return { code: 0, data: { totalIn, totalOut, balance: totalIn - totalOut, count: records.length } }
  },

  // 分页获取记录列表，支持按方向/类型筛选
  async getList({ page = 0, direction, type } = {}) {
    let where = { _openid: this.openid }
    if (direction && direction !== 'all') where.direction = direction
    if (type && type !== 'all') where.type = type

    const [listRes, countRes] = await Promise.all([
      col.where(where).orderBy('eventTime', 'desc').skip(page * PAGE_SIZE).limit(PAGE_SIZE).get(),
      col.where(where).count()
    ])
    return {
      code: 0,
      data: listRes.data,
      total: countRes.total,
      hasMore: listRes.data.length === PAGE_SIZE
    }
  },

  // 按联系人分组，支持分页，每页20条记录
  async getContactList({ page = 0 } = {}) {
    const [listRes, countRes] = await Promise.all([
      col.where({ _openid: this.openid }).orderBy('eventTime', 'desc').skip(page * PAGE_SIZE).limit(PAGE_SIZE).get(),
      col.where({ _openid: this.openid }).count()
    ])
    // 前端分组聚合
    const map = {}
    listRes.data.forEach(r => {
      const name = r.contactName
      if (!map[name]) {
        map[name] = { contactName: name, totalIn: 0, totalOut: 0, lastTime: r.eventTime }
      }
      if (r.direction === 'in') map[name].totalIn += r.amount || 0
      else map[name].totalOut += r.amount || 0
      if (r.eventTime > map[name].lastTime) map[name].lastTime = r.eventTime
    })
    const list = Object.values(map).sort((a, b) => b.lastTime - a.lastTime)
    return {
      code: 0,
      data: list,
      total: countRes.total,
      hasMore: listRes.data.length === PAGE_SIZE
    }
  },

  // 获取某联系人的所有记录
  async getByContact(contactName) {
    if (!contactName) return { code: -1, msg: '缺少联系人' }
    const res = await col
      .where({ _openid: this.openid, contactName })
      .orderBy('eventTime', 'desc')
      .get()
    return { code: 0, data: res.data }
  },

  // 关键词搜索
  async search(keyword) {
    if (!keyword || !keyword.trim()) return { code: 0, data: [] }
    const kw = keyword.trim()
    const reg = new RegExp(kw, 'i')
    const dbCmd = db.command
    const where = dbCmd.and([
      { _openid: this.openid },
      dbCmd.or([{ contactName: reg }, { remark: reg }, { type: reg }])
    ])
    const res = await col.where(where).orderBy('eventTime', 'desc').limit(50).get()
    return { code: 0, data: res.data }
  },

  // 添加记录
  async add(item) {
    if (!item.contactName || !item.amount) {
      return { code: -1, msg: '联系人和金额不能为空' }
    }
    const now = Date.now()
    const res = await col.add({
      contactName: item.contactName.trim(),
      amount: Number(item.amount),
      direction: item.direction || 'out',  // out=送出 in=收到
      type: item.type || '红包',           // 红包/礼物/随礼/其他
      eventTime: item.eventTime || now,
      occasion: item.occasion ? item.occasion.trim() : '',
      remark: item.remark ? item.remark.trim() : '',
      createTime: now,
      updateTime: now,
      _openid: this.openid
    })
    return { code: 0, data: { _id: res.id } }
  },

  // 更新记录
  async update(item) {
    if (!item._id) return { code: -1, msg: '缺少id' }
    await col.doc(item._id).update({
      contactName: item.contactName.trim(),
      amount: Number(item.amount),
      direction: item.direction || 'out',
      type: item.type || '红包',
      eventTime: item.eventTime,
      occasion: item.occasion ? item.occasion.trim() : '',
      remark: item.remark ? item.remark.trim() : '',
      updateTime: Date.now()
    })
    return { code: 0 }
  },

  // 删除记录
  async remove(id) {
    if (!id) return { code: -1, msg: '缺少id' }
    await col.doc(id).remove()
    return { code: 0 }
  },

  // 获取单条记录
  async getOne(id) {
    if (!id) return { code: -1, msg: '缺少id' }
    const res = await col.doc(id).get()
    if (!res.data || res.data.length === 0) return { code: -1, msg: '记录不存在' }
    const item = res.data[0]
    if (item._openid !== this.openid) return { code: -1, msg: '无权限' }
    return { code: 0, data: item }
  }
}
