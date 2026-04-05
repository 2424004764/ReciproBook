<script>
import { ensureLogin } from './utils/auth.js'

export default {
  onLaunch() {
    // 预热登录，后续所有云对象调用都依赖这个 openid
    ensureLogin().catch(e => console.error('预热登录失败', e))
  }
}
</script>

<style>
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
