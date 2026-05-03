<template>
  <view class="container">
    <!-- 联系人头部 -->
    <view class="contact-header">
      <view class="avatar">{{ name.slice(0, 1) }}</view>
      <text class="contact-name">{{ name }}</text>
      <view class="balance-row">
        <text class="balance-label">净{{ balance >= 0 ? '收入' : '支出' }}</text>
        <text class="balance-amount" :class="balance >= 0 ? 'in' : 'out'">
          {{ balance >= 0 ? '+' : '-' }}¥{{ formatAmount(Math.abs(balance)) }}
        </text>
      </view>
      <view class="stat-row">
        <view class="stat-item">
          <text class="stat-num out">¥{{ formatAmount(totalOut) }}</text>
          <text class="stat-label">我送出</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num in">¥{{ formatAmount(totalIn) }}</text>
          <text class="stat-label">我收到</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ records.length }}</text>
          <text class="stat-label">共{{ records.length }}笔</text>
        </view>
      </view>
    </view>

    <!-- 记录列表 -->
    <scroll-view class="list-scroll" scroll-y>
      <view v-if="records.length === 0 && !loading" class="empty">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无往来记录</text>
      </view>

      <view
        v-for="item in records"
        :key="item._id"
        class="record-item"
        @tap="goEdit(item)"
      >
        <view class="record-left">
          <view class="record-direction" :class="item.direction === 'in' ? 'dir-in' : 'dir-out'">
            {{ item.direction === 'in' ? '收' : '送' }}
          </view>
        </view>
        <view class="record-body">
          <view class="record-top">
            <view class="record-tags">
              <text class="record-type">{{ item.type }}</text>
              <text v-if="item.occasion" class="record-occasion">{{ item.occasion }}</text>
            </view>
            <text class="record-amount" :class="item.direction === 'in' ? 'amount-in' : 'amount-out'">
              {{ item.direction === 'in' ? '+' : '-' }}¥{{ formatAmount(item.amount) }}
            </text>
          </view>
          <view class="record-bottom">
            <text v-if="item.remark" class="record-remark">{{ item.remark }}</text>
            <text class="record-time">{{ formatTime(item.eventTime) }}</text>
          </view>
        </view>
      </view>

      <view style="height: 60rpx;"></view>
    </scroll-view>

    <!-- 添加按钮 -->
    <view class="fab" @tap="goAdd">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script>
import { ensureLogin } from '@/utils/auth.js'
import { api } from '@/utils/api.js'

export default {
  data() {
    return {
      name: '',
      records: [],
      loading: false,
      inited: false,
      _refreshed: false
    }
  },
  computed: {
    totalIn() {
      return this.records.filter(r => r.direction === 'in').reduce((s, r) => s + (r.amount || 0), 0)
    },
    totalOut() {
      return this.records.filter(r => r.direction === 'out').reduce((s, r) => s + (r.amount || 0), 0)
    },
    balance() {
      return this.totalIn - this.totalOut
    }
  },
  onLoad(options) {
    if (options.name) {
      this.name = decodeURIComponent(options.name)
      uni.setStorageSync('rq_detail_name', this.name)
      uni.setNavigationBarTitle({ title: this.name + ' 的往来' })
      // 清除上次编辑留下的名称变更，避免影响新查询
      uni.removeStorageSync('rq_updated_name')
      this.loadRecords()
    }
  },
  onShow() {
    // 每次显示先清除编辑标记，仅在本次有编辑刷新时才设为 true
    this._refreshed = false
    // 页面被回收后状态丢失，从存储恢复联系人名称
    if (!this.name) {
      this.name = uni.getStorageSync('rq_detail_name') || ''
      if (!this.name) return
      uni.setNavigationBarTitle({ title: this.name + ' 的往来' })
    }
    // 从 add 页面保存后，联系人名称可能已变更
    const updatedName = uni.getStorageSync('rq_updated_name')
    if (updatedName) {
      this.name = updatedName
      uni.setStorageSync('rq_detail_name', updatedName)
      uni.setNavigationBarTitle({ title: updatedName + ' 的往来' })
    }
    uni.removeStorageSync('rq_updated_name')
    // 从 add 页面保存/删除后返回时触发的刷新
    const needRefresh = uni.getStorageSync('rq_need_refresh')
    if (needRefresh) {
      uni.removeStorageSync('rq_need_refresh')
      this._refreshed = true
      this.loadRecords()
      return
    }
    // 页面被回收导致数据丢失且当前没有加载中的请求，重新加载
    if (this.records.length === 0 && !this.loading) {
      this.loadRecords()
    }
  },
  onUnload() {
    // 如果详情页有数据更新，通知首页也刷新
    if (this._refreshed) {
      uni.setStorageSync('rq_need_refresh', true)
    }
  },
  methods: {
    async loadRecords() {
      this.loading = true
      try {
        await ensureLogin()
        const res = await api.getByContact(this.name)
        if (res.code === 0) {
          this.records = res.data
          if (res.data.length === 0) {
            console.warn('getByContact returned empty for:', this.name, 'uid:', uni.getStorageSync('rq_detail_name'))
          }
        } else {
          console.error('加载记录失败 code:', res.code, 'msg:', res.msg, 'name:', this.name)
          uni.showToast({ title: `加载失败(${res.code})`, icon: 'none' })
        }
      } catch (e) {
        console.error('加载记录异常:', e, 'name:', this.name)
        uni.showToast({ title: '网络请求失败', icon: 'none' })
      } finally {
        this.loading = false
        this.inited = true
      }
    },
    goEdit(item) {
      uni.navigateTo({ url: `/pages/add/add?id=${item._id}` })
    },
    goAdd() {
      uni.navigateTo({ url: `/pages/add/add?contact=${encodeURIComponent(this.name)}` })
    },
    formatAmount(val) {
      return Number(val || 0).toFixed(2)
    },
    formatTime(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }
  }
}
</script>

<style scoped>
.container { min-height: 100vh; background: #f5f5f5; }

/* 头部 */
.contact-header {
  background: linear-gradient(135deg, #e8392a, #ff6b5b);
  padding: 40rpx 40rpx 50rpx;
  display: flex; flex-direction: column; align-items: center;
  color: #fff;
}
.avatar {
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  font-size: 44rpx; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16rpx;
}
.contact-name { font-size: 36rpx; font-weight: bold; margin-bottom: 16rpx; }
.balance-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 30rpx; }
.balance-label { font-size: 26rpx; opacity: 0.8; }
.balance-amount { font-size: 44rpx; font-weight: bold; }
.balance-amount.in { color: #c8ffd4; }
.balance-amount.out { color: #ffe0dd; }

.stat-row { display: flex; align-items: center; width: 100%; justify-content: space-around; }
.stat-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
.stat-num { font-size: 32rpx; font-weight: bold; color: #fff; }
.stat-num.out { color: #ffe0dd; }
.stat-num.in { color: #c8ffd4; }
.stat-label { font-size: 22rpx; opacity: 0.75; margin-top: 6rpx; }
.stat-divider { width: 1rpx; height: 50rpx; background: rgba(255,255,255,0.3); }

/* 列表 */
.list-scroll { height: calc(100vh - 420rpx); }

.record-item {
  display: flex; align-items: center;
  background: #fff; margin: 16rpx 24rpx 0;
  border-radius: 16rpx; padding: 24rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}
.record-left { margin-right: 20rpx; }
.record-direction {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; font-weight: bold; color: #fff;
}
.dir-in { background: #4caf50; }
.dir-out { background: #e8392a; }
.record-body { flex: 1; }
.record-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.record-tags { display: flex; gap: 10rpx; align-items: center; }
.record-type {
  background: #fff0ee; color: #e8392a;
  font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx;
}
.record-occasion { font-size: 24rpx; color: #666; }
.record-amount { font-size: 32rpx; font-weight: bold; }
.amount-in { color: #4caf50; }
.amount-out { color: #e8392a; }
.record-bottom { display: flex; justify-content: space-between; align-items: center; }
.record-remark { font-size: 24rpx; color: #999; flex: 1; margin-right: 16rpx; }
.record-time { font-size: 22rpx; color: #bbb; }

/* 空状态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #bbb; }

/* FAB */
.fab {
  position: fixed; right: 40rpx; bottom: 60rpx;
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: linear-gradient(135deg, #e8392a, #ff6b5b);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(232,57,42,0.4);
  z-index: 99;
}
.fab-icon { font-size: 60rpx; color: #fff; line-height: 1; margin-top: -4rpx; }
</style>
