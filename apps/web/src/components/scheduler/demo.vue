<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

/**
 * ================================================================
 * 1. Scheduler
 * ================================================================
 */

type SchedulerCallback = () => SchedulerCallback | undefined

interface SchedulerTask {
  id: number
  priority: number
  callback: SchedulerCallback
  isActive: boolean
}

const ImmediatePriority = 1
const UserBlockingPriority = 2
const NormalPriority = 3
const LowPriority = 4
const IdlePriority = 5

let taskQueue: SchedulerTask[] = []
let isScheduled = false
let currentTask: SchedulerTask | null = null
let taskIdCounter = 0
let frameStartTime = 0

const FRAME_INTERVAL = 5

const channel = new MessageChannel()
const port = channel.port2

channel.port1.onmessage = () => {
  isScheduled = false
  schedulerWorkLoop()
}

function scheduleCallback(priority: number, callback: SchedulerCallback): number {
  const taskId = ++taskIdCounter

  const task: SchedulerTask = {
    id: taskId,
    priority,
    callback,
    isActive: true,
  }

  let insertIndex = taskQueue.length

  for (let i = 0; i < taskQueue.length; i++) {
    if (taskQueue[i].priority > priority) {
      insertIndex = i
      break
    }
  }

  taskQueue.splice(insertIndex, 0, task)

  requestSchedulerFlush()

  return taskId
}

function cancelCallback(taskId: number) {
  const index = taskQueue.findIndex((task) => task.id === taskId)

  if (index !== -1) {
    taskQueue[index].isActive = false
    taskQueue.splice(index, 1)
  }

  if (currentTask?.id === taskId) {
    currentTask.isActive = false
  }
}

function requestSchedulerFlush() {
  if (isScheduled) return

  isScheduled = true
  port.postMessage(null)
}

function shouldYield(): boolean {
  return performance.now() - frameStartTime >= FRAME_INTERVAL
}

function now(): number {
  return performance.now()
}

function insertTask(task: SchedulerTask) {
  let insertIndex = taskQueue.length

  for (let i = 0; i < taskQueue.length; i++) {
    if (taskQueue[i].priority > task.priority) {
      insertIndex = i
      break
    }
  }

  taskQueue.splice(insertIndex, 0, task)
}

function schedulerWorkLoop() {
  frameStartTime = performance.now()

  while (taskQueue.length > 0) {
    const task = taskQueue.shift()

    if (!task || !task.isActive) {
      continue
    }

    currentTask = task

    try {
      const continuation = task.callback()

      if (typeof continuation === 'function' && task.isActive) {
        task.callback = continuation

        // continuation 重新进入优先级队列。
        // 这样更高优先级的新任务可以抢占当前任务。
        insertTask(task)
      } else {
        task.isActive = false
      }
    } catch (error) {
      console.error('任务执行错误:', error)
      task.isActive = false
    } finally {
      currentTask = null
    }

    if (shouldYield() && taskQueue.length > 0) {
      requestSchedulerFlush()
      return
    }
  }

  isScheduled = false
}

function resetScheduler() {
  for (const task of taskQueue) {
    task.isActive = false
  }

  taskQueue = []

  if (currentTask) {
    currentTask.isActive = false
  }

  currentTask = null
  isScheduled = false
}

/**
 * ================================================================
 * 2. 类型
 * ================================================================
 */

type Status = 'idle' | 'running' | 'paused' | 'done' | 'cancelled'

type LogType = 'info' | 'success' | 'warning' | 'error' | 'chunk' | 'priority' | 'stat'

interface DataItem {
  id: number
  value: number
  processed: boolean
  result: number | null
}

interface LogEntry {
  id: number
  time: string
  message: string
  type: LogType
}

/**
 * ================================================================
 * 3. Vue State
 * ================================================================
 */

const state = reactive({
  total: 500_000,
  processed: 0,
  chunks: 0,

  status: 'idle' as Status,

  isRunning: false,
  isPaused: false,
  isCancelled: false,

  currentTaskId: null as number | null,

  startTime: 0,
  elapsed: 0,
  speed: 0,

  lastUpdateProcessed: 0,
  logThrottle: 0,

  data: null as DataItem[] | null,
})

const logs = ref<LogEntry[]>([])

const logContainer = ref<HTMLElement | null>(null)

let logId = 0
let elapsedTimer: number | null = null

/**
 * ================================================================
 * 4. Computed
 * ================================================================
 */

const progress = computed(() => {
  if (state.total <= 0) return 0

  return Math.min(100, Math.round((state.processed / state.total) * 100))
})

const progressText = computed(() => {
  return `${progress.value}% (${formatNumber(state.processed)}/${formatNumber(state.total)})`
})

const statusText = computed(() => {
  const map: Record<Status, string> = {
    idle: '⏸ 空闲',
    running: '▶ 运行中',
    paused: '⏸ 已暂停',
    done: '✅ 已完成',
    cancelled: '⛔ 已取消',
  }

  return map[state.status]
})

const statusClass = computed(() => {
  return `badge-${state.status}`
})

const progressClass = computed(() => ({
  done: state.status === 'done',
  cancelled: state.status === 'cancelled',
}))

const isTaskActive = computed(() => {
  return state.status === 'running' || state.status === 'paused'
})

/**
 * ================================================================
 * 5. 工具函数
 * ================================================================
 */

function formatNumber(value: number): string {
  return value.toLocaleString()
}

function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`
  }

  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(2)} s`
  }

  return `${(ms / 60_000).toFixed(2)} min`
}

function getLogClass(type: LogType): string {
  return `msg-${type}`
}

function getLogEmoji(type: LogType): string {
  const emojis: Record<LogType, string> = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    chunk: '🧩',
    priority: '🎯',
    stat: '📊',
  }

  return emojis[type]
}

function log(message: string, type: LogType = 'info') {
  logs.value.push({
    id: ++logId,
    time: new Date().toLocaleTimeString(),
    message,
    type,
  })

  if (logs.value.length > 800) {
    logs.value.splice(0, logs.value.length - 800)
  }

  nextTick(() => {
    if (!logContainer.value) return

    logContainer.value.scrollTop = logContainer.value.scrollHeight
  })
}

function clearLogs() {
  logs.value = []

  log('日志已清空', 'info')
}

function updateStats() {
  if (!state.isRunning || state.startTime <= 0) {
    return
  }

  state.elapsed = now() - state.startTime

  const seconds = state.elapsed / 1000

  if (seconds > 0.5) {
    state.speed = Math.round(state.processed / seconds)
  }
}

function startElapsedTimer() {
  stopElapsedTimer()

  elapsedTimer = window.setInterval(() => {
    updateStats()
  }, 100)
}

function stopElapsedTimer() {
  if (elapsedTimer !== null) {
    window.clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}

function setStatus(status: Status) {
  state.status = status

  state.isRunning = status === 'running' || status === 'paused'

  state.isPaused = status === 'paused'

  if (status === 'done' || status === 'cancelled' || status === 'idle') {
    stopElapsedTimer()
  }
}

function resetState() {
  state.processed = 0
  state.chunks = 0

  state.isRunning = false
  state.isPaused = false
  state.isCancelled = false

  state.currentTaskId = null

  state.startTime = 0
  state.elapsed = 0
  state.speed = 0

  state.lastUpdateProcessed = 0
  state.logThrottle = 0

  state.data = null

  setStatus('idle')
}

/**
 * ================================================================
 * 6. 模拟 CPU 计算
 * ================================================================
 */

function performWork(item: DataItem): number {
  let result = 0

  const iterations = 15 + Math.floor(Math.random() * 25)

  for (let i = 0; i < iterations; i++) {
    result += Math.sin(item.value + i * 0.1) * Math.cos(item.value - i * 0.1)

    result += Math.sqrt(Math.abs(item.value + i)) * 0.05
  }

  return result
}

/**
 * ================================================================
 * 7. 创建 50 万数据
 * ================================================================
 */

function createData() {
  log(`正在生成 ${formatNumber(state.total)} 条测试数据...`, 'info')

  state.data = new Array<DataItem>(state.total)

  const batchSize = 100_000

  for (let start = 0; start < state.total; start += batchSize) {
    const end = Math.min(start + batchSize, state.total)

    for (let i = start; i < end; i++) {
      state.data[i] = {
        id: i,
        value: Math.random() * 1000,
        processed: false,
        result: null,
      }
    }

    if (start > 0) {
      log(`已生成 ${formatNumber(end)} 条数据`, 'info')
    }
  }
}

/**
 * ================================================================
 * 8. 分片任务
 * ================================================================
 */

function createChunkedTask(): SchedulerCallback {
  createData()

  state.processed = 0
  state.chunks = 0

  state.isCancelled = false
  state.isPaused = false

  state.startTime = now()
  state.elapsed = 0

  state.lastUpdateProcessed = 0
  state.logThrottle = 0

  log(`开始处理 ${formatNumber(state.total)} 项数据`, 'success')

  setStatus('running')
  startElapsedTimer()

  function workLoop(): SchedulerCallback | undefined {
    if (state.isCancelled) {
      finishCancelledTask()
      return undefined
    }

    if (state.isPaused) {
      return workLoop
    }

    if (!state.data) {
      return undefined
    }

    const chunkStart = now()
    const chunkStartProcessed = state.processed

    while (state.processed < state.total) {
      if (shouldYield()) {
        state.chunks++

        const processedInChunk = state.processed - chunkStartProcessed

        const chunkDuration = now() - chunkStart

        state.logThrottle++

        const pct = (state.processed / state.total) * 100

        if (state.logThrottle % 20 === 0 || pct - Math.floor(pct) < 0.5) {
          log(
            `分片 #${formatNumber(state.chunks)} 处理 ${formatNumber(
              processedInChunk,
            )} 项，耗时 ${chunkDuration.toFixed(2)}ms，进度 ${pct.toFixed(1)}%`,
            'chunk',
          )
        }

        state.lastUpdateProcessed = state.processed

        updateStats()

        return workLoop
      }

      const item = state.data[state.processed]

      item.result = performWork(item)
      item.processed = true

      state.processed++

      if (state.processed % 2000 === 0 || state.processed === state.total) {
        updateStats()
      }
    }

    finishCompletedTask()

    return undefined
  }

  return workLoop
}

/**
 * ================================================================
 * 9. 完成 / 取消
 * ================================================================
 */

function finishCompletedTask() {
  const totalTime = now() - state.startTime

  state.elapsed = totalTime

  const avgChunkTime = state.chunks > 0 ? totalTime / state.chunks : totalTime

  state.speed = totalTime > 0 ? Math.round(state.total / (totalTime / 1000)) : 0

  log('任务完成！', 'success')

  log(`总数据: ${formatNumber(state.total)} 项`, 'stat')

  log(`分片数: ${formatNumber(state.chunks)}`, 'stat')

  log(`总耗时: ${formatTime(totalTime)}`, 'stat')

  log(`平均每片: ${avgChunkTime.toFixed(2)} ms`, 'stat')

  log(`处理速度: ${formatNumber(state.speed)} 项/秒`, 'stat')

  state.currentTaskId = null
  state.data = null

  setStatus('done')
}

function finishCancelledTask() {
  log('任务已被取消', 'error')

  state.currentTaskId = null
  state.data = null

  setStatus('cancelled')
}

/**
 * ================================================================
 * 10. 启动
 * ================================================================
 */

function startTask() {
  if (state.currentTaskId !== null) {
    cancelCallback(state.currentTaskId)

    state.currentTaskId = null
  }

  if (logs.value.length > 50) {
    logs.value = []
    log('已清空旧日志', 'info')
  }

  resetState()

  const workLoop = createChunkedTask()

  state.currentTaskId = scheduleCallback(NormalPriority, workLoop)

  log('任务已加入调度队列（优先级: 普通）', 'info')
}

/**
 * ================================================================
 * 11. 取消
 * ================================================================
 */

function cancelTask() {
  if (state.currentTaskId === null) {
    return
  }

  state.isCancelled = true
  state.isPaused = false

  cancelCallback(state.currentTaskId)

  state.currentTaskId = null

  log('正在取消任务...', 'warning')

  state.data = null

  setStatus('cancelled')
}

/**
 * ================================================================
 * 12. 暂停 / 继续
 * ================================================================
 */

function togglePause() {
  if (!isTaskActive.value) {
    return
  }

  if (!state.isPaused) {
    state.isPaused = true

    log('用户暂停任务', 'warning')

    setStatus('paused')

    return
  }

  state.isPaused = false

  log('用户恢复任务', 'info')

  setStatus('running')

  if (state.currentTaskId !== null) {
    cancelCallback(state.currentTaskId)
  }

  state.currentTaskId = scheduleCallback(NormalPriority, createResumeTask())

  log('任务已重新调度', 'info')
}

function createResumeTask(): SchedulerCallback {
  function continueWork(): SchedulerCallback | undefined {
    if (state.isCancelled) {
      finishCancelledTask()
      return undefined
    }

    if (state.isPaused) {
      return continueWork
    }

    if (!state.data) {
      return undefined
    }

    const chunkStart = now()

    while (state.processed < state.total && !shouldYield()) {
      const item = state.data[state.processed]

      item.result = performWork(item)
      item.processed = true

      state.processed++

      if (state.processed % 2000 === 0) {
        updateStats()
      }
    }

    state.chunks++

    const chunkDuration = now() - chunkStart

    state.logThrottle++

    if (state.logThrottle % 20 === 0) {
      log(
        `恢复任务分片 #${formatNumber(state.chunks)}，耗时 ${chunkDuration.toFixed(2)}ms`,
        'chunk',
      )
    }

    updateStats()

    if (state.processed < state.total) {
      return continueWork
    }

    finishCompletedTask()

    return undefined
  }

  return continueWork
}

/**
 * ================================================================
 * 13. 优先级测试
 * ================================================================
 */

function testPriorities() {
  log('开始测试不同优先级任务', 'priority')

  log('高优先级任务会优先于低优先级 continuation 执行', 'priority')

  const tasks = [
    {
      name: '🔥 紧急',
      priority: ImmediatePriority,
      items: 300,
    },
    {
      name: '👆 用户交互',
      priority: UserBlockingPriority,
      items: 500,
    },
    {
      name: '📊 普通',
      priority: NormalPriority,
      items: 800,
    },
    {
      name: '📦 低',
      priority: LowPriority,
      items: 1200,
    },
    {
      name: '💤 空闲',
      priority: IdlePriority,
      items: 2000,
    },
  ]

  let completed = 0

  tasks.forEach(({ name, priority, items }) => {
    const data = Array.from({ length: items }, (_, index) => index)

    let processed = 0

    scheduleCallback(priority, function work(): SchedulerCallback | undefined {
      const start = now()

      let count = 0

      while (processed < data.length && !shouldYield()) {
        let sum = 0

        for (let i = 0; i < 20; i++) {
          sum += Math.sin(data[processed] + i * 0.1) * Math.cos(data[processed] - i * 0.1)
        }

        // 防止编译器/开发工具认为计算结果完全无意义。
        void sum

        processed++
        count++
      }

      const duration = now() - start

      if (processed < data.length) {
        log(`${name} 优先级处理 ${count} 项 (${processed}/${data.length})，继续...`, 'priority')

        return work
      }

      completed++

      log(`${name} 优先级完成！共 ${items} 项，最后一批耗时 ${duration.toFixed(2)}ms`, 'success')

      if (completed === tasks.length) {
        log('所有优先级测试完成！', 'success')
      }

      return undefined
    })
  })

  log('所有任务已提交，观察执行顺序', 'priority')
}

/**
 * ================================================================
 * 14. 移动方块
 * ================================================================
 */

const movingBox = ref<HTMLElement | null>(null)

let animationId: number | null = null

let boxX = 0
let boxY = 0

let speedX = 0
let speedY = 0

const BOX_SIZE = 50

function initMovingBox() {
  const maxX = window.innerWidth - BOX_SIZE

  const maxY = window.innerHeight - BOX_SIZE

  boxX = Math.random() * Math.max(maxX, 0)

  boxY = Math.random() * Math.max(maxY, 0)

  const baseSpeed = 1 + Math.random() * 3

  speedX = Math.random() > 0.5 ? baseSpeed : -baseSpeed

  speedY = Math.random() > 0.5 ? baseSpeed : -baseSpeed

  moveBox()
}

function moveBox() {
  const el = movingBox.value

  if (!el) return

  const maxX = Math.max(window.innerWidth - BOX_SIZE, 0)

  const maxY = Math.max(window.innerHeight - BOX_SIZE, 0)

  boxX += speedX
  boxY += speedY

  if (boxX <= 0 || boxX >= maxX) {
    speedX *= -1
  }

  if (boxY <= 0 || boxY >= maxY) {
    speedY *= -1
  }

  boxX = Math.max(0, Math.min(boxX, maxX))

  boxY = Math.max(0, Math.min(boxY, maxY))

  el.style.transform = `translate3d(${boxX}px, ${boxY}px, 0)`

  animationId = requestAnimationFrame(moveBox)
}

/**
 * ================================================================
 * 15. 调试 API
 * ================================================================
 */

interface DemoWindow extends Window {
  __demo?: {
    start: typeof startTask
    cancel: typeof cancelTask
    pause: typeof togglePause
    test: typeof testPriorities
    state: typeof state
    Scheduler: {
      ImmediatePriority: number
      UserBlockingPriority: number
      NormalPriority: number
      LowPriority: number
      IdlePriority: number
      scheduleCallback: typeof scheduleCallback
      cancelCallback: typeof cancelCallback
      shouldYield: typeof shouldYield
      now: typeof now
      reset: typeof resetScheduler
      getQueue: () => SchedulerTask[]
    }
    help: () => void
  }
}

function exposeDebugAPI() {
  const demoWindow = window as DemoWindow

  demoWindow.__demo = {
    start: startTask,
    cancel: cancelTask,
    pause: togglePause,
    test: testPriorities,

    state,

    Scheduler: {
      ImmediatePriority,
      UserBlockingPriority,
      NormalPriority,
      LowPriority,
      IdlePriority,

      scheduleCallback,
      cancelCallback,
      shouldYield,
      now,

      reset: resetScheduler,

      getQueue: () => taskQueue,
    },

    help() {
      console.log('📖 可用命令:')

      console.log('  __demo.start()     - 启动分片任务 (50万数据)')

      console.log('  __demo.cancel()    - 取消当前任务')

      console.log('  __demo.pause()     - 暂停/继续任务')

      console.log('  __demo.test()      - 测试优先级')

      console.log('  __demo.state       - 查看当前状态')

      console.log('  __demo.Scheduler   - 查看 Scheduler API')
    },
  }
}

/**
 * ================================================================
 * 16. 生命周期
 * ================================================================
 */

onMounted(() => {
  exposeDebugAPI()
  initMovingBox()

  log('Scheduler 独立 Demo 已加载（Vue 3 版）', 'success')

  log(`数据量: ${formatNumber(state.total)} 项`, 'info')

  log('点击 "启动分片任务" 开始体验', 'info')

  log('控制台输入 __demo.help() 查看调试命令', 'info')

  console.log('✅ Scheduler Vue 3 Demo 已就绪')

  console.log('💡 输入 __demo.help() 查看可用命令')
})

onBeforeUnmount(() => {
  stopElapsedTimer()

  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }

  if (state.currentTaskId !== null) {
    cancelCallback(state.currentTaskId)
  }

  resetScheduler()

  channel.port1.close()
  channel.port2.close()

  const demoWindow = window as DemoWindow

  delete demoWindow.__demo
})
</script>

<template>
  <div class="scheduler-demo">
    <div class="container">
      <h1>⏱️ Scheduler 分片任务 Demo</h1>

      <p class="subtitle">
        Vue 3 + MessageChannel Scheduler · 不依赖任何外部包 · 数据量
        <strong>
          {{ formatNumber(state.total) }}
        </strong>
        项
      </p>

      <div class="success-box">
        ✅ 使用浏览器原生
        <code>MessageChannel</code>
        实现调度，完全独立，无需加载任何外部资源。
      </div>

      <div class="controls">
        <button class="btn-success" :disabled="isTaskActive" @click="startTask">
          ▶ 启动分片任务
        </button>

        <button class="btn-danger" :disabled="!isTaskActive" @click="cancelTask">
          ⏹ 取消任务
        </button>

        <button class="btn-warning" :disabled="!isTaskActive" @click="togglePause">
          {{ state.isPaused ? '▶ 继续' : '⏸ 暂停' }}
        </button>

        <button class="btn-secondary" @click="clearLogs">🗑 清空日志</button>

        <button class="btn-primary" @click="testPriorities">🎯 测试优先级</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">已处理</div>

          <div class="value">
            {{ formatNumber(state.processed) }}
          </div>
        </div>

        <div class="stat-card">
          <div class="label">分片数</div>

          <div class="value">
            {{ formatNumber(state.chunks) }}
          </div>
        </div>

        <div class="stat-card">
          <div class="label">总耗时</div>

          <div class="value">
            {{ formatTime(state.elapsed) }}
          </div>
        </div>

        <div class="stat-card">
          <div class="label">处理速度</div>

          <div class="value">
            {{ formatNumber(state.speed) }}
            /s
          </div>
        </div>

        <div class="stat-card">
          <div class="label">状态</div>

          <div class="value status-value">
            <span class="badge" :class="statusClass">
              {{ statusText }}
            </span>
          </div>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-bar-wrapper">
          <div
            class="progress-fill"
            :class="progressClass"
            :style="{
              width: `${progress}%`,
            }"
          >
            {{ progressText }}
          </div>
        </div>
      </div>

      <div class="info-hint">
        💡 每片约 5ms，高优先级任务可以在 continuation 重新进入队列后优先执行。打开控制台输入
        <code>__demo.help()</code>
        查看调试命令。
      </div>

      <div ref="logContainer" class="log-container">
        <div class="log-entry">
          <span class="time"> [系统] </span>

          <span class="msg-info"> Scheduler 已就绪（Vue 3 自实现版） </span>
        </div>

        <div v-for="entry in logs" :key="entry.id" class="log-entry">
          <span class="time"> [{{ entry.time }}] </span>

          <span :class="getLogClass(entry.type)">
            {{ getLogEmoji(entry.type) }}
            {{ entry.message }}
          </span>
        </div>
      </div>
    </div>

    <div ref="movingBox" class="moving-box" />
  </div>
</template>

<style scoped>
.scheduler-demo {
  min-height: 100vh;
  padding: 20px;
  background: #f0f2f5;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.scheduler-demo * {
  box-sizing: border-box;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

h1 {
  margin: 0;
  font-size: 28px;
  color: #1a1a2e;
}

.subtitle {
  margin-top: 8px;
  color: #6c757d;
  font-size: 15px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 24px 0 16px;
}

button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-primary {
  color: white;
  background: #4f46e5;
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
}

.btn-danger {
  color: white;
  background: #ef4444;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-success {
  color: white;
  background: #22c55e;
}

.btn-success:hover:not(:disabled) {
  background: #16a34a;
}

.btn-secondary {
  color: #374151;
  background: #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #d1d5db;
}

.btn-warning {
  color: white;
  background: #f59e0b;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.stat-card {
  padding: 16px 20px;
  text-align: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.stat-card .label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.stat-card .value {
  margin-top: 4px;
  color: #0f172a;
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-card .status-value {
  font-size: 18px;
}

.progress-section {
  margin: 20px 0;
}

.progress-bar-wrapper {
  position: relative;
  height: 32px;
  overflow: hidden;
  background: #e2e8f0;
  border-radius: 16px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.progress-fill {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 100%;
  color: white;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  background: linear-gradient(90deg, #4f46e5, #818cf8);
  border-radius: 16px;
  transition: width 0.15s ease-out;
}

.progress-fill.done {
  background: linear-gradient(90deg, #22c55e, #4ade80);
}

.progress-fill.cancelled {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.log-container {
  max-height: 350px;
  margin-top: 20px;
  padding: 16px 20px;
  overflow-y: auto;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.8;
  background: #0f172a;
  border-radius: 12px;
}

.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 3px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}

.log-entry {
  padding: 2px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.log-entry .time {
  margin-right: 12px;
  color: #64748b;
  user-select: none;
}

.msg-info {
  color: #93c5fd;
}

.msg-success {
  color: #86efac;
}

.msg-warning {
  color: #fcd34d;
}

.msg-error {
  color: #fca5a5;
}

.msg-chunk {
  color: #c4b5fd;
}

.msg-priority {
  color: #67e8f9;
}

.msg-stat {
  color: #f9a8d4;
}

.badge {
  display: inline-block;
  padding: 2px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-idle {
  color: #475569;
  background: #e2e8f0;
}

.badge-running {
  color: #3730a3;
  background: #c7d2fe;
}

.badge-done {
  color: #166534;
  background: #bbf7d0;
}

.badge-cancelled {
  color: #991b1b;
  background: #fecaca;
}

.badge-paused {
  color: #92400e;
  background: #fef3c7;
}

.info-hint {
  margin: 12px 0;
  padding: 10px 16px;
  color: #475569;
  font-size: 13px;
  background: #f1f5f9;
  border-left: 4px solid #4f46e5;
  border-radius: 8px;
}

.info-hint code {
  padding: 1px 6px;
  color: #1e293b;
  font-size: 12px;
  background: #e2e8f0;
  border-radius: 4px;
}

.success-box {
  margin: 12px 0;
  padding: 12px 16px;
  color: #166534;
  font-size: 14px;
  background: #f0fdf4;
  border-left: 4px solid #22c55e;
  border-radius: 8px;
}

/*
 * 用 transform 而不是持续修改 left/top，
 * 避免移动方块自身频繁触发布局。
 */
.moving-box {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  width: 50px;
  height: 50px;
  pointer-events: none;
  background: linear-gradient(135deg, #4f46e5, #22c55e);
  border-radius: 8px;
  will-change: transform;
}
</style>
