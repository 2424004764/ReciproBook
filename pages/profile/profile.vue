<template>
  <view class="container">
    <!-- 用户信息 -->
    <view class="user-card">
      <view class="user-avatar">
        <image v-if="userInfo.avatarUrl" :src="userInfo.avatarUrl" class="avatar-img" />
        <text v-else class="avatar-placeholder">👤</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userInfo.nickName || '微信用户' }}</text>
        <text class="user-sub">人情账本用户</text>
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <button class="btn-wx-login" open-type="getUserInfo" @getuserinfo="onGetUserInfo" v-if="!userInfo.nickName">
        授权登录
      </button>
      <!-- #endif -->
    </view>

    <!-- 统计概览 -->
    <view class="stats-card">
      <view class="stats-item">
        <text class="stats-num">{{ summary.count }}</text>
        <text class="stats-label">总记录</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item">
        <text class="stats-num out">¥{{ formatAmount(summary.totalOut) }}</text>
        <text class="stats-label">累计送出</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item">
        <text class="stats-num in">¥{{ formatAmount(summary.totalIn) }}</text>
        <text class="stats-label">累计收到</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-card">
      <view class="menu-item" @tap="showAbout">
        <text class="menu-icon">ℹ️</text>
        <text class="menu-text">关于人情账本</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 关于弹窗 -->
    <view class="modal-mask" v-if="aboutVisible" @tap="aboutVisible = false">
      <view class="modal-box" @tap.stop>
        <text class="modal-title">人情账本</text>
        <text class="modal-content">记录每一次人情往来，不再忘记谁帮过你、你还欠谁。支持红包、礼物、随礼等记录，帮你轻松管理人情关系。</text>
        <view class="modal-btn" @tap="aboutVisible = false">关闭</view>
      </view>
    </view>
  </view>
</template>

<script>
import { ensureLogin } from '@/utils/auth.js'
const recordCo = uniCloud.importObject('record-co')

export default {
  data() {
    return {
      userInfo: {},
      summary: { totalIn: 0, totalOut: 0, count: 0 },
      aboutVisible: false
    }
  },
  onShow() {
    this.loadSummary()
    // 读取缓存的用户信息
    const info = uni.getStorageSync('userInfo')
    if (info) this.userInfo = info
  },
  methods: {
    async loadSummary() {
      await ensureLogin()
      const res = await recordCo.getSummary()
      if (res.code === 0) this.summary = res.data
    },
    onGetUserInfo(e) {
      if (e.detail.userInfo) {
        this.userInfo = e.detail.userInfo
        uni.setStorageSync('userInfo', e.detail.userInfo)
      }
    },
    showAbout() {
      this.aboutVisible = true
    },
    formatAmount(val) {
      return Number(val || 0).toFixed(2)
    }
  }
}
</script>

<style scoped>
.container { min-height: 100vh; background: #f5f5f5; }

/* 用户卡片 */
.user-card {
  background: linear-gradient(135deg, #e8392a, #ff6b5b);
  padding: 60rpx 40rpx 50rpx;
  display: flex; align-items: center;
}
.user-avatar {
  width: 120rpx; height: 120rpx; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; }
.avatar-placeholder { font-size: 60rpx; }
.user-info { flex: 1; margin-left: 28rpx; }
.user-name { font-size: 36rpx; font-weight: bold; color: #fff; display: block; margin-bottom: 8rpx; }
.user-sub { font-size: 24rpx; color: rgba(255,255,255,0.75); }
.btn-wx-login {
  background: rgba(255,255,255,0.2); color: #fff;
  font-size: 26rpx; padding: 12rpx 28rpx; border-radius: 30rpx;
  border: 2rpx solid rgba(255,255,255,0.5);
}

/* 统计卡片 */
.stats-card {
  background: #fff; margin: 24rpx;
  border-radius: 16rpx; padding: 30rpx;
  display: flex; align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.stats-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.stats-num { font-size: 36rpx; font-weight: bold; color: #333; }
.stats-num.out { color: #4caf50; }
.stats-num.in { color: #e8392a; }
.stats-label { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.stats-divider { width: 1rpx; height: 50rpx; background: #eee; }

/* 菜单 */
.menu-card {
  background: #fff; margin: 0 24rpx;
  border-radius: 16rpx; overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.menu-item {
  display: flex; align-items: center;
  padding: 32rpx; min-height: 100rpx;
}
.menu-icon { font-size: 36rpx; margin-right: 20rpx; }
.menu-text { flex: 1; font-size: 30rpx; color: #333; }
.menu-arrow { font-size: 36rpx; color: #ccc; }
.divider { height: 1rpx; background: #f5f5f5; margin: 0 32rpx; }

/* 弹窗 */
.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999;
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: #fff; border-radius: 24rpx;
  padding: 48rpx 40rpx; margin: 0 60rpx;
  display: flex; flex-direction: column; align-items: center;
}
.modal-title { font-size: 36rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; }
.modal-content { font-size: 28rpx; color: #666; line-height: 1.8; text-align: center; margin-bottom: 20rpx; }
.modal-version { font-size: 24rpx; color: #bbb; margin-bottom: 40rpx; }
.modal-btn {
  background: linear-gradient(135deg, #e8392a, #ff6b5b);
  color: #fff; font-size: 30rpx; font-weight: bold;
  padding: 20rpx 80rpx; border-radius: 40rpx;
}
</style>
