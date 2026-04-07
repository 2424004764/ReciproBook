<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索联系人、场合..."
          @input="onSearch"
          confirm-type="search"
        />
        <text v-if="keyword" class="search-clear" @tap="clearSearch">✕</text>
      </view>
    </view>

    <!-- 顶部统计卡片 -->
    <view class="summary-card">
      <view class="summary-row">
        <view class="summary-item">
          <text class="summary-num out">¥{{ formatAmount(summary.totalOut) }}</text>
          <text class="summary-label">我送出</text>
        </view>
        <view class="summary-divider"></view>
        <view class="summary-item">
          <text class="summary-num in">¥{{ formatAmount(summary.totalIn) }}</text>
          <text class="summary-label">我收到</text>
        </view>
        <view class="summary-divider"></view>
        <view class="summary-item">
          <text class="summary-num" :class="summary.balance >= 0 ? 'in' : 'out'">
            ¥{{ formatAmount(Math.abs(summary.balance)) }}
          </text>
          <text class="summary-label">{{ summary.balance >= 0 ? '净收入' : '净支出' }}</text>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="tab-bar" v-if="!keyword">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="switchTab(tab.key)"
      >{{ tab.label }}</view>
    </view>

    <!-- 列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 搜索结果 -->
      <template v-if="keyword">
        <view v-if="searchList.length === 0 && !loading" class="empty">
          <text class="empty-icon">🔍</text>
          <text class="empty-text">没有找到相关记录</text>
        </view>
        <view
          v-for="item in searchList"
          :key="item._id"
          class="record-item"
          @tap="goDetail(item)"
        >
          <view class="record-direction" :class="item.direction === 'in' ? 'dir-in' : 'dir-out'">
            {{ item.direction === 'in' ? '收' : '送' }}
          </view>
          <view class="record-body">
            <view class="record-top">
              <text class="record-contact">{{ item.contactName }}</text>
              <text class="record-amount" :class="item.direction === 'in' ? 'amount-in' : 'amount-out'">
                {{ item.direction === 'in' ? '+' : '-' }}¥{{ formatAmount(item.amount) }}
              </text>
            </view>
            <view class="record-bottom">
              <text class="record-tag">{{ item.type }}</text>
              <text v-if="item.occasion" class="record-occasion">{{ item.occasion }}</text>
              <text class="record-time">{{ formatTime(item.eventTime) }}</text>
            </view>
            <text v-if="item.remark" class="record-remark">{{ item.remark }}</text>
          </view>
        </view>
      </template>

      <!-- 联系人分组视图 -->
      <template v-else-if="activeTab === 'contact'">
        <view v-if="contactList.length === 0 && !loading" class="empty">
          <text class="empty-icon">📖</text>
          <text class="empty-text">还没有记录，快去添加吧</text>
        </view>
        <view
          v-for="contact in contactList"
          :key="contact.contactName"
          class="contact-item"
          @tap="goContactDetail(contact.contactName)"
        >
          <view class="contact-avatar">{{ contact.contactName.slice(0, 1) }}</view>
          <view class="contact-info">
            <view class="contact-name-row">
              <text class="contact-name">{{ contact.contactName }}</text>
              <text class="contact-time">{{ formatTime(contact.lastTime) }}</text>
            </view>
            <view class="contact-amount-row">
              <text class="contact-out">送出 ¥{{ formatAmount(contact.totalOut) }}</text>
              <text class="contact-in">收到 ¥{{ formatAmount(contact.totalIn) }}</text>
            </view>
          </view>
          <view class="contact-balance" :class="(contact.totalIn - contact.totalOut) >= 0 ? 'balance-in' : 'balance-out'">
            <text>{{ (contact.totalIn - contact.totalOut) >= 0 ? '+' : '-' }}</text>
            <text>¥{{ formatAmount(Math.abs(contact.totalIn - contact.totalOut)) }}</text>
          </view>
        </view>
      </template>
      <template v-else>
        <view v-if="recordList.length === 0 && !loading" class="empty">
          <text class="empty-icon">📖</text>
          <text class="empty-text">还没有记录，快去添加吧</text>
        </view>
        <view
          v-for="item in recordList"
          :key="item._id"
          class="record-item"
          @tap="goDetail(item)"
        >
          <view class="record-direction" :class="item.direction === 'in' ? 'dir-in' : 'dir-out'">
            {{ item.direction === 'in' ? '收' : '送' }}
          </view>
          <view class="record-body">
            <view class="record-top">
              <text class="record-contact">{{ item.contactName }}</text>
              <text class="record-amount" :class="item.direction === 'in' ? 'amount-in' : 'amount-out'">
                {{ item.direction === 'in' ? '+' : '-' }}¥{{ formatAmount(item.amount) }}
              </text>
            </view>
            <view class="record-bottom">
              <text class="record-tag">{{ item.type }}</text>
              <text v-if="item.occasion" class="record-occasion">{{ item.occasion }}</text>
              <text class="record-time">{{ formatTime(item.eventTime) }}</text>
            </view>
            <text v-if="item.remark" class="record-remark">{{ item.remark }}</text>
          </view>
        </view>
        <view v-if="hasMore" class="load-more" @tap="loadMore">加载更多</view>
        <view v-if="!hasMore && recordList.length > 0" class="no-more">没有更多了</view>
      </template>

      <view style="height: 120rpx;"></view>
    </scroll-view>

    <!-- 添加按钮 -->
    <view class="fab" @tap="goAdd">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script>
import { ensureLogin } from '@/utils/auth.js'
const recordCo = uniCloud.importObject('record-co')

export default {
  data() {
    return {
      summary: { totalIn: 0, totalOut: 0, balance: 0, count: 0 },
      tabs: [
        { key: 'contact', label: '按联系人' },
        { key: 'timeline', label: '时间线' }
      ],
      activeTab: 'contact',
      contactList: [],
      recordList: [],
      searchList: [],
      keyword: '',
      page: 0,
      hasMore: false,
      loading: false,
      refreshing: false,
      searchTimer: null,
      inited: false
    }
  },
  onShow() {
    const needRefresh = uni.getStorageSync('rq_need_refresh')
    if (needRefresh) {
      uni.removeStorageSync('rq_need_refresh')
      this.loadAll()
    } else if (!this.inited) {
      this.loadAll()
    }
  },
  methods: {
    async loadAll() {
      this.loading = true
      try {
        await ensureLogin()
        const [summaryRes, contactRes] = await Promise.all([
          recordCo.getSummary(),
          recordCo.getContactList()
        ])
        if (summaryRes.code === 0) this.summary = summaryRes.data
        if (contactRes.code === 0) {
          this.contactList = contactRes.data
        }
        if (this.activeTab === 'timeline') await this.loadTimeline(true)
        this.inited = true
      } catch (e) {
        console.error(e)
      }
      this.loading = false
    },
    async loadTimeline(reset = false) {
      if (reset) { this.page = 0; this.recordList = [] }
      const res = await recordCo.getList({ page: this.page })
      if (res.code === 0) {
        this.recordList = reset ? res.data : [...this.recordList, ...res.data]
        this.hasMore = res.hasMore
      }
    },
    async switchTab(key) {
      this.activeTab = key
      if (key === 'timeline' && this.recordList.length === 0) {
        await this.loadTimeline(true)
      }
    },
    async loadMore() {
      if (this.activeTab === 'contact') return  // 联系人视图已全量加载
      if (!this.hasMore || this.loading) return
      this.page++
      await this.loadTimeline()
    },
    async onRefresh() {
      this.refreshing = true
      await this.loadAll()
      this.refreshing = false
    },
    onSearch() {
      clearTimeout(this.searchTimer)
      const kw = this.keyword.trim()
      if (!kw) { this.searchList = []; return }
      this.searchTimer = setTimeout(async () => {
        const res = await recordCo.search(kw)
        if (res.code === 0) this.searchList = res.data
      }, 600)
    },
    clearSearch() {
      this.keyword = ''
      this.searchList = []
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/add/add' })
    },
    goDetail(item) {
      uni.navigateTo({ url: `/pages/add/add?id=${item._id}` })
    },
    goContactDetail(name) {
      uni.navigateTo({ url: `/pages/detail/detail?name=${encodeURIComponent(name)}` })
    },
    formatAmount(val) {
      return Number(val || 0).toFixed(2)
    },
    formatTime(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  }
}
</script>

<style scoped>
.container { min-height: 100vh; background: #f5f5f5; }

/* 统计卡片 */
.summary-card {
  background: linear-gradient(135deg, #e8392a, #ff6b5b);
  padding: 30rpx 40rpx 40rpx;
  color: #fff;
}
.summary-title { font-size: 28rpx; opacity: 0.85; margin-bottom: 24rpx; }
.summary-row { display: flex; align-items: center; justify-content: space-around; }
.summary-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
.summary-num { font-size: 40rpx; font-weight: bold; color: #fff; }
.summary-num.out { color: #c8ffd4; }
.summary-num.in { color: #ffe0dd; }
.summary-label { font-size: 24rpx; opacity: 0.8; margin-top: 8rpx; }
.summary-divider { width: 1rpx; height: 60rpx; background: rgba(255,255,255,0.3); }

/* 搜索 */
.search-bar { padding: 20rpx 24rpx; background: linear-gradient(135deg, #e8392a, #ff6b5b); }
.search-input-wrap {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.25); border-radius: 40rpx;
  padding: 12rpx 24rpx;
}
.search-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #fff; }
.search-input::placeholder { color: rgba(255,255,255,0.7); }
.search-clear { font-size: 28rpx; color: rgba(255,255,255,0.8); padding: 0 8rpx; }

/* Tab */
.tab-bar {
  display: flex; background: #fff;
  border-bottom: 1rpx solid #eee;
  padding: 0 24rpx;
}
.tab-item {
  flex: 1; text-align: center;
  padding: 20rpx 0; font-size: 28rpx; color: #666;
  position: relative;
}
.tab-item.active {
  color: #e8392a; font-weight: bold;
}
.tab-item.active::after {
  content: ''; position: absolute; bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 40rpx; height: 4rpx; background: #e8392a; border-radius: 2rpx;
}

/* 列表 */
.list-scroll { height: calc(100vh - 380rpx); }

/* 联系人卡片 */
.contact-item {
  display: flex; align-items: center;
  background: #fff; margin: 16rpx 24rpx 0;
  border-radius: 16rpx; padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.contact-avatar {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: linear-gradient(135deg, #e8392a, #ff6b5b);
  color: #fff; font-size: 32rpx; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.contact-info { flex: 1; margin: 0 20rpx; }
.contact-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.contact-name { font-size: 30rpx; font-weight: bold; color: #333; }
.contact-time { font-size: 22rpx; color: #bbb; }
.contact-amount-row { display: flex; gap: 20rpx; }
.contact-out { font-size: 24rpx; color: #4caf50; }
.contact-in { font-size: 24rpx; color: #e8392a; }
.contact-balance { font-size: 28rpx; font-weight: bold; flex-shrink: 0; }
.balance-in { color: #e8392a; }
.balance-out { color: #4caf50; }

/* 时间线记录 */
.record-item {
  display: flex; align-items: flex-start;
  background: #fff; margin: 16rpx 24rpx 0;
  border-radius: 16rpx; padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.record-direction {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; font-weight: bold; color: #fff;
  flex-shrink: 0; margin-right: 20rpx; margin-top: 4rpx;
}
.dir-in { background: #4caf50; }
.dir-out { background: #e8392a; }
.record-body { flex: 1; }
.record-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.record-contact { font-size: 30rpx; font-weight: bold; color: #333; }
.record-amount { font-size: 32rpx; font-weight: bold; }
.amount-in { color: #e8392a; }
.amount-out { color: #4caf50; }
.record-bottom { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.record-tag {
  background: #fff0ee; color: #e8392a;
  font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx;
}
.record-occasion { font-size: 24rpx; color: #666; }
.record-time { font-size: 22rpx; color: #bbb; margin-left: auto; }
.record-remark { font-size: 24rpx; color: #999; margin-top: 10rpx; display: block; }

/* 空状态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #bbb; }

/* 加载更多 */
.load-more, .no-more { text-align: center; padding: 30rpx; font-size: 26rpx; color: #bbb; }

/* FAB */
.fab {
  position: fixed; right: 40rpx; bottom: 120rpx;
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: linear-gradient(135deg, #e8392a, #ff6b5b);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(232,57,42,0.4);
  z-index: 99;
}
.fab-icon { font-size: 60rpx; color: #fff; line-height: 1; margin-top: -4rpx; }
</style>
