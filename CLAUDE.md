# ReciproBook（人情账本）

uni-app 开发的微信小程序，用于记录人情往来。

## 架构

- 前端：uni-app (Vue 3)，微信小程序
- 后端：Cloudflare Workers  (D:\dev\cloudflare\workers\recipro-book)
- 数据库：Cloudflare D1 (SQLite)
- 本地调试：`http://127.0.0.1:8787`

## 前端项目结构

```
pages/
├── index/      # 首页账本：统计、联系人/时间线视图、搜索
├── add/        # 添加/编辑记录
├── detail/     # 某联系人的往来详情
└── profile/    # 我的页面：用户信息、总统计
utils/
├── api.js      # Cloudflare Workers HTTP API 封装
└── auth.js     # 微信登录与 JWT token 管理
```

## API 接口

前端通过 `utils/api.js` 调用后端 API：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/user/login | 微信登录 |
| GET | /api/records/summary | 统计数据 |
| GET | /api/records | 分页列表 |
| GET | /api/records/contacts | 联系人聚合 |
| GET | /api/records/contact/{name} | 联系人记录 |
| GET | /api/records/search?keyword= | 搜索 |
| POST | /api/records | 添加记录 |
| GET | /api/records/{id} | 单条记录 |
| PUT | /api/records/{id} | 更新记录 |
| DELETE | /api/records/{id} | 删除记录 |

统一响应格式：`{ code: 0, msg: 'ok', data: ... }`，错误时 `code` 为 HTTP 状态码。

## 认证

- 微信 `wx.login()` 获取 code → POST `/api/user/login` → 服务端换取 openid → 返回 JWT token
- Token 有效期 30 天，存储在 `uni.storage` 中
- 后续请求通过 `Authorization: Bearer <token>` 传递
