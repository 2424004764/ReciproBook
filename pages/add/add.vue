<template>
  <view class="container">
    <!-- 方向选择 -->
    <view class="section">
      <view class="direction-tabs">
        <view
          class="dir-tab"
          :class="{ 'dir-out-active': form.direction === 'out' }"
          @tap="form.direction = 'out'"
        >
          <text class="dir-icon">🎁</text>
          <text>我送出</text>
        </view>
        <view
          class="dir-tab"
          :class="{ 'dir-in-active': form.direction === 'in' }"
          @tap="form.direction = 'in'"
        >
          <text class="dir-icon">🧧</text>
          <text>我收到</text>
        </view>
      </view>
    </view>

    <!-- 表单 -->
    <view class="form-card">
      <!-- 联系人 -->
      <view class="form-item">
        <text class="form-label">联系人</text>
        <input
          class="form-input"
          v-model="form.contactName"
          placeholder="请输入姓名"
          maxlength="20"
        />
      </view>
      <view class="divider"></view>

      <!-- 金额 -->
      <view class="form-item">
        <text class="form-label">金额</text>
        <view class="amount-wrap">
          <text class="amount-symbol">¥</text>
          <input
            class="form-input amount-input"
            v-model="form.amount"
            type="digit"
            placeholder="0.00"
          />
        </view>
      </view>
      <view class="divider"></view>

      <!-- 类型 -->
      <view class="form-item">
        <text class="form-label">类型</text>
        <view class="type-list">
          <view
            v-for="t in types"
            :key="t"
            class="type-tag"
            :class="{ 'type-active': form.type === t }"
            @tap="form.type = t"
          >{{ t }}</view>
        </view>
      </view>
      <view class="divider"></view>

      <!-- 场合 -->
      <view class="form-item">
        <text class="form-label">场合</text>
        <input
          class="form-input"
          v-model="form.occasion"
          placeholder="如：婚礼、生日、春节..."
          maxlength="30"
        />
      </view>
      <view class="divider"></view>

      <!-- 日期 -->
      <picker mode="date" :value="displayDate" @change="onDateChange">
        <view class="form-item">
          <text class="form-label">日期</text>
          <view class="form-value-row">
            <text class="form-value">{{ displayDate }}</text>
            <text class="form-arrow">›</text>
          </view>
        </view>
      </picker>
      <view class="divider"></view>

      <!-- 备注 -->
      <view class="form-item form-item-col">
        <text class="form-label">备注</text>
        <textarea
          class="form-textarea"
          v-model="form.remark"
          placeholder="添加备注..."
          maxlength="200"
          auto-height
        />
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="btn-group">
      <button class="btn-save" @tap="save" :loading="saving">
        {{ isEdit ? '保存修改' : '记录人情' }}
      </button>
      <button v-if="isEdit" class="btn-delete" @tap="confirmDelete">删除记录</button>
    </view>
  </view>
</template>

<script>
import { ensureLogin } from '@/utils/auth.js'
const recordCo = uniCloud.importObject('record-co')

export default {
  data() {
    return {
      isEdit: false,
      editId: '',
      saving: false,
      types: ['红包', '礼物', '随礼', '请客', '借款', '还款', '其他'],
      form: {
        contactName: '',
        amount: '',
        direction: 'out',
        type: '红包',
        occasion: '',
        eventTime: Date.now(),
        remark: ''
      }
    }
  },
  computed: {
    displayDate() {
      const d = new Date(this.form.eventTime)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true
      this.editId = options.id
      this.loadRecord(options.id)
    }
    if (options.contact) {
      this.form.contactName = decodeURIComponent(options.contact)
    }
  },
  methods: {
    async loadRecord(id) {
      await ensureLogin()
      uni.showLoading({ title: '加载中' })
      try {
        const res = await recordCo.getOne(id)
        if (res.code === 0) {
          const d = res.data
          this.form = {
            contactName: d.contactName,
            amount: String(d.amount),
            direction: d.direction,
            type: d.type,
            occasion: d.occasion || '',
            eventTime: d.eventTime,
            remark: d.remark || ''
          }
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    onDateChange(e) {
      const dateStr = e.detail.value  // 'YYYY-MM-DD'
      this.form.eventTime = new Date(dateStr).getTime()
    },
    async save() {
      // 统一去除前后空格
      this.form.contactName = (this.form.contactName || '').trim()
      this.form.occasion = (this.form.occasion || '').trim()
      this.form.remark = (this.form.remark || '').trim()

      if (!this.form.contactName) {
        return uni.showToast({ title: '请输入联系人', icon: 'none' })
      }
      if (!this.form.amount || isNaN(Number(this.form.amount)) || Number(this.form.amount) <= 0) {
        return uni.showToast({ title: '请输入有效金额', icon: 'none' })
      }
      this.saving = true
      try {
        await ensureLogin()
        let res
        if (this.isEdit) {
          res = await recordCo.update({ ...this.form, _id: this.editId, amount: Number(this.form.amount) })
        } else {
          res = await recordCo.add({ ...this.form, amount: Number(this.form.amount) })
        }
        if (res.code === 0) {
          uni.showToast({ title: this.isEdit ? '修改成功' : '记录成功', icon: 'success' })
          // 标记首页需要刷新
          uni.setStorageSync('rq_need_refresh', true)
          setTimeout(() => uni.navigateBack(), 1000)
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络错误', icon: 'none' })
      }
      this.saving = false
    },
    confirmDelete() {
      uni.showModal({
        title: '确认删除',
        content: '删除后无法恢复，确定删除这条记录吗？',
        confirmColor: '#e8392a',
        success: async (res) => {
          if (res.confirm) {
            await recordCo.remove(this.editId)
            uni.showToast({ title: '已删除', icon: 'success' })
            uni.setStorageSync('rq_need_refresh', true)
            setTimeout(() => uni.navigateBack(), 800)
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.container { min-height: 100vh; background: #f5f5f5; padding-bottom: 60rpx; }

/* 方向选择 */
.section { padding: 24rpx; }
.direction-tabs { display: flex; gap: 20rpx; }
.dir-tab {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 28rpx 0; border-radius: 16rpx;
  background: #fff; border: 3rpx solid transparent;
  font-size: 28rpx; color: #666;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
  transition: all 0.2s;
}
.dir-icon { font-size: 48rpx; margin-bottom: 10rpx; }
.dir-out-active { border-color: #e8392a; color: #e8392a; background: #fff5f4; }
.dir-in-active { border-color: #4caf50; color: #4caf50; background: #f4fff5; }

/* 表单卡片 */
.form-card { background: #fff; margin: 0 24rpx; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.form-item { display: flex; align-items: center; padding: 28rpx 32rpx; min-height: 96rpx; }
.form-item-col { flex-direction: column; align-items: flex-start; }
.form-label { font-size: 28rpx; color: #333; font-weight: 500; width: 120rpx; flex-shrink: 0; }
.form-input { flex: 1; font-size: 28rpx; color: #333; text-align: right; }
.amount-wrap { flex: 1; display: flex; align-items: center; justify-content: flex-end; }
.amount-symbol { font-size: 36rpx; color: #e8392a; font-weight: bold; margin-right: 8rpx; }
.amount-input { font-size: 40rpx; color: #e8392a; font-weight: bold; text-align: right; }
.form-value-row { flex: 1; display: flex; align-items: center; justify-content: flex-end; }
.form-value { font-size: 28rpx; color: #333; }
.form-arrow { font-size: 36rpx; color: #ccc; margin-left: 8rpx; }
.form-textarea { width: 100%; font-size: 28rpx; color: #333; margin-top: 16rpx; min-height: 100rpx; line-height: 1.6; }
.divider { height: 1rpx; background: #f5f5f5; margin: 0 32rpx; }

/* 类型标签 */
.type-list { flex: 1; display: flex; flex-wrap: wrap; gap: 12rpx; justify-content: flex-end; }
.type-tag {
  padding: 8rpx 20rpx; border-radius: 30rpx;
  font-size: 24rpx; color: #666;
  background: #f5f5f5; border: 2rpx solid transparent;
}
.type-active { background: #fff0ee; color: #e8392a; border-color: #e8392a; }

/* 按钮 */
.btn-group { padding: 40rpx 24rpx 0; }
.btn-save {
  width: 100%; height: 96rpx; border-radius: 48rpx;
  background: linear-gradient(135deg, #e8392a, #ff6b5b);
  color: #fff; font-size: 32rpx; font-weight: bold;
  border: none; box-shadow: 0 8rpx 24rpx rgba(232,57,42,0.35);
  display: flex; align-items: center; justify-content: center;
  line-height: 96rpx;
}
.btn-delete {
  width: 100%; height: 88rpx; border-radius: 44rpx;
  background: #fff; color: #e8392a; font-size: 30rpx;
  border: 2rpx solid #e8392a; margin-top: 20rpx;
}
</style>
