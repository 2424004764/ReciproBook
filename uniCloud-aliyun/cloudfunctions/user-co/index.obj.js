// 云对象：用户登录鉴权，通过微信 code 换取 openid
const db = uniCloud.database()
const usersCol = db.collection('users')

module.exports = {
  // 微信小程序登录，前端用 wx.login() 拿到的 code
  async login(code) {
    if (!code) return { code: -1, msg: '缺少code' }

    // 读取微信配置
    const config = require('uni-config-center')({ pluginId: 'weixin' })
    const appid = config.config('appId')
    const secret = config.config('appSecret')

    // 用 code 换 openid + session_key
    const requestRes = await uniCloud.httpclient.request(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`,
      { dataType: 'json' }
    )

    const wxData = requestRes.data
    if (wxData.errcode) {
      return { code: -1, msg: wxData.errmsg || '微信登录失败' }
    }

    const openid = wxData.openid
    const userRes = await usersCol.where({ openid }).limit(1).get()
    const now = Date.now()

    if (userRes.data.length === 0) {
      await usersCol.add({ openid, createTime: now, lastLoginTime: now })
    } else {
      await usersCol.doc(userRes.data[0]._id).update({ lastLoginTime: now })
    }

    const token = Buffer.from(openid + now).toString('base64')
    return { code: 0, openid, token }
  }
}
