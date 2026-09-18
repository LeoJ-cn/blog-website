/* eslint-disable */
/**
 * 完整内存监控器
 * 同时监控 JS 堆内存 + 整个网页内存（估算）
 */
class MemoryMonitor {
  constructor(options = {}) {
    this.options = {
      sampleInterval: options.sampleInterval || 2000,
      ...options
    }

    // ============ JS 堆内存数据 ============
    this.jsHeap = {
      current: 0,
      peak: 0,
      initial: 0,
      limit: 0,
      history: []
    }

    // ============ 网页总内存数据（估算） ============
    this.totalMemory = {
      current: 0,
      peak: 0,
      initial: 0,
      history: []
    }

    // ============ 运行状态 ============
    this.isRunning = false
    this.intervalId = null
    this._onUpdate = null

    // 检测 API 支持
    this.hasJSHeap = !!performance.memory
    this.hasDetailed = !!performance.measureUserAgentSpecificMemory

    // DOM 元素数量（用于估算）
    this.domCount = 0

    console.log('📊 内存监控器初始化:')
    console.log(`  - JS Heap API: ${this.hasJSHeap ? '✅' : '❌'}`)
    console.log(`  - Detailed API: ${this.hasDetailed ? '✅' : '❌'}`)
  }

  /**
   * 获取 JS 堆内存 (MB)
   */
  getJSHeap() {
    if (!this.hasJSHeap) {
      return {
        used: 0,
        total: 0,
        limit: 0
      }
    }

    try {
      const mem = performance.memory
      return {
        used: Math.round(mem.usedJSHeapSize / (1024 * 1024)),
        total: Math.round(mem.totalJSHeapSize / (1024 * 1024)),
        limit: Math.round(mem.jsHeapSizeLimit / (1024 * 1024))
      }
    } catch (e) {
      return { used: 0, total: 0, limit: 0 }
    }
  }

  /**
   * 获取网页总内存 (MB)
   * 通过多种方式综合估算
   */
  async getTotalMemory() {
    let total = 0
    let breakdown = []

    // ===== 方式1: 使用 measureUserAgentSpecificMemory (Chrome 87+) =====
    if (this.hasDetailed) {
      try {
        const result = await performance.measureUserAgentSpecificMemory()
        total = Math.round(result.bytes / (1024 * 1024))
        breakdown = result.breakdown.map(item => ({
          type: item.types.join(','),
          size: Math.round(item.bytes / (1024 * 1024))
        }))
        return { total, breakdown, source: 'detailed' }
      } catch (e) {
        // 失败则继续其他方式
      }
    }

    // ===== 方式2: 基于 JS 堆估算 =====
    const jsHeap = this.getJSHeap()
    if (jsHeap.used > 0) {
      // 获取 DOM 元素数量
      this.domCount = document.getElementsByTagName('*').length

      // 获取图片数量
      const imageCount = document.images.length

      // 获取 Canvas 数量
      const canvasCount = document.querySelectorAll('canvas').length

      // 计算倍数
      let multiplier = 2 // 基础倍数

      // DOM 元素越多，倍数越高
      if (this.domCount > 5000) multiplier += 3
      else if (this.domCount > 2000) multiplier += 2
      else if (this.domCount > 500) multiplier += 1

      // 图片增加内存
      if (imageCount > 50) multiplier += 1
      if (imageCount > 200) multiplier += 1

      // Canvas 增加内存
      if (canvasCount > 5) multiplier += 1
      if (canvasCount > 20) multiplier += 1

      // 估算总内存 = JS堆 × 倍数
      total = Math.round(jsHeap.used * multiplier)

      return {
        total,
        breakdown: [
          { type: 'JS Heap', size: jsHeap.used },
          { type: `DOM (${this.domCount} elements)`, size: Math.round(jsHeap.used * (multiplier - 1) * 0.5) },
          { type: `Images/Resources`, size: Math.round(jsHeap.used * (multiplier - 1) * 0.3) },
          { type: 'Other', size: Math.round(jsHeap.used * (multiplier - 1) * 0.2) }
        ],
        source: 'estimated',
        details: {
          domCount: this.domCount,
          imageCount,
          canvasCount,
          multiplier
        }
      }
    }

    return { total: 0, breakdown: [], source: 'none' }
  }

  /**
   * 获取当前 DOM 元素数量
   */
  getDOMCount() {
    return document.getElementsByTagName('*').length
  }

  /**
   * 采样内存
   */
  async sample() {
    // ===== 1. 采样 JS 堆内存 =====
    const jsHeapData = this.getJSHeap()
    this.jsHeap.current = jsHeapData.used

    if (jsHeapData.used > this.jsHeap.peak) {
      this.jsHeap.peak = jsHeapData.used
    }

    if (this.jsHeap.initial === 0) {
      this.jsHeap.initial = jsHeapData.used
    }

    this.jsHeap.limit = jsHeapData.limit
    this.jsHeap.history.push({
      timestamp: Date.now(),
      memory: jsHeapData.used
    })
    if (this.jsHeap.history.length > 30) {
      this.jsHeap.history.shift()
    }

    // ===== 2. 采样网页总内存 =====
    const totalData = await this.getTotalMemory()
    this.totalMemory.current = totalData.total

    if (totalData.total > this.totalMemory.peak) {
      this.totalMemory.peak = totalData.total
    }

    if (this.totalMemory.initial === 0) {
      this.totalMemory.initial = totalData.total
    }

    this.totalMemory.history.push({
      timestamp: Date.now(),
      memory: totalData.total,
      breakdown: totalData.breakdown
    })
    if (this.totalMemory.history.length > 30) {
      this.totalMemory.history.shift()
    }

    // ===== 3. 更新 DOM 计数 =====
    this.domCount = this.getDOMCount()

    // ===== 4. 触发更新回调 =====
    if (typeof this._onUpdate === 'function') {
      this._onUpdate(this.getReport())
    }

    // ===== 5. 控制台输出调试信息 =====
    if (this.options.debug) {
      console.log(`📊 [采样] JS堆: ${this.jsHeap.current}MB | 总内存: ${this.totalMemory.current}MB | DOM: ${this.domCount}`)
    }
  }

  /**
   * 启动监控
   */
  async start() {
    if (this.isRunning) return
    this.isRunning = true

    // 重置数据
    this.jsHeap.peak = 0
    this.jsHeap.initial = 0
    this.totalMemory.peak = 0
    this.totalMemory.initial = 0

    // 立即采样
    await this.sample()

    // 定时采样
    this.intervalId = setInterval(async () => {
      await this.sample()
    }, this.options.sampleInterval)
  }

  /**
   * 停止监控
   */
  stop() {
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * 获取报告
   */
  getReport() {
    return {
      // JS 堆内存
      jsHeap: {
        current: this.jsHeap.current,
        peak: this.jsHeap.peak,
        initial: this.jsHeap.initial,
        growth: this.jsHeap.peak - this.jsHeap.initial,
        limit: this.jsHeap.limit,
        history: this.jsHeap.history.slice(-10),
      },
      // 网页总内存
      totalMemory: {
        current: this.totalMemory.current,
        peak: this.totalMemory.peak,
        initial: this.totalMemory.initial,
        growth: this.totalMemory.peak - this.totalMemory.initial,
        history: this.totalMemory.history.slice(-10),
      },
      // DOM 信息
      dom: {
        count: this.domCount,
      },
      // 摘要
      summary: {
        jsHeapUsed: this.jsHeap.current,
        totalMemoryUsed: this.totalMemory.current,
        jsHeapPeak: this.jsHeap.peak,
        totalMemoryPeak: this.totalMemory.peak,
        memoryRatio: this.totalMemory.current > 0
          ? Math.round((this.jsHeap.current / this.totalMemory.current) * 100)
          : 0,
      }
    }
  }

  /**
   * 设置更新回调
   */
  set onUpdate(callback) {
    this._onUpdate = callback
  }

  /**
   * 销毁
   */
  destroy() {
    this.stop()
    this.jsHeap.history = []
    this.totalMemory.history = []
    this._onUpdate = null
  }
}


// 创建监控器
const monitor = new MemoryMonitor({
  sampleInterval: 2000,
  debug: true
})

// 设置更新回调
monitor.onUpdate = (report) => {
  console.log('📊 内存报告:')
  console.log(`  JS 堆: ${report.jsHeap.current}MB (峰值: ${report.jsHeap.peak}MB)`)
  console.log(`  网页总内存: ${report.totalMemory.current}MB (峰值: ${report.totalMemory.peak}MB)`)
  console.log(`  DOM 元素: ${report.dom.count}`)
  console.log(`  占比: JS堆占总内存 ${report.summary.memoryRatio}%`)
}

// 启动
await monitor.start()

// 执行你的测试...
// ...

// 获取最终报告
const report = monitor.getReport()
console.log('📊 最终报告:', report)
