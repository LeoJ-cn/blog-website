export interface MovingBox {
  id: number
  el: HTMLDivElement
  x: number
  y: number
  speedX: number
  speedY: number
  size: number
}

export interface CreateMovingBoxOptions {
  size?: number
  speed?: number
}

export interface MovingBoxDemoState {
  /** 是否在每次 RAF 回调内执行同步 CPU busy loop。 */
  frameTaskEnabled: boolean
  /** 每帧主动占用主线程的目标毫秒数，内部限制为 0~32。 */
  frameWorkMs: number
  /** 是否额外按固定间隔制造一次长任务。 */
  longTaskEnabled: boolean
  /** 每次长任务占用主线程的目标毫秒数，内部限制为 0~500。 */
  longTaskWorkMs: number
  /** 当前由管理器创建并驱动的动画元素数量。 */
  runningBoxes: number
}

export type MovingBoxStateListener = (state: MovingBoxDemoState) => void

export const FRAME_PRESSURE_OPTIONS = [2, 4, 8, 12, 20] as const
export const LONG_TASK_PRESSURE_OPTIONS = [50, 100, 200] as const

const LONG_TASK_INTERVAL = 1000

// 该管理器故意制造可控的主线程压力，用于观察监控指标变化，不应复用于业务动画。
class PerformanceSimulationManager {
  private boxes = new Map<number, MovingBox>()
  private animationId: number | null = null
  private longTaskTimerId: number | null = null
  private idCounter = 0
  private frameTaskEnabled = false
  private frameWorkMs: number = FRAME_PRESSURE_OPTIONS[0]
  private longTaskEnabled = false
  private longTaskWorkMs: number = LONG_TASK_PRESSURE_OPTIONS[0]
  private cpuAccumulator = 0
  private stateListeners = new Set<MovingBoxStateListener>()

  create(options: CreateMovingBoxOptions = {}): number {
    const { size = 50, speed = 2 } = options
    const id = ++this.idCounter
    const el = document.createElement('div')
    const hue = Math.floor(Math.random() * 360)

    el.className = 'moving-box moving-box--managed'
    el.dataset.testid = 'managed-moving-box'
    el.textContent = String(id)
    el.style.width = `${size}px`
    el.style.height = `${size}px`
    el.style.backgroundColor = `hsl(${hue} 78% 58%)`
    el.style.boxShadow = `0 8px 24px hsl(${hue} 78% 58% / 35%)`
    document.body.appendChild(el)

    const { minX, maxX, minY, maxY } = this.getMovementBounds(size)
    const box: MovingBox = {
      id,
      el,
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
      speedX: this.randomDirection() * speed,
      speedY: this.randomDirection() * speed,
      size,
    }

    this.boxes.set(id, box)
    this.start()
    this.emitState()

    return id
  }

  remove(id: number): boolean {
    const box = this.boxes.get(id)

    if (!box) {
      return false
    }

    box.el.remove()
    this.boxes.delete(id)

    if (this.boxes.size === 0) {
      this.disableAllTasks()
      this.stopIfIdle()
    }

    this.emitState()

    return true
  }

  clear(): void {
    for (const box of this.boxes.values()) {
      box.el.remove()
    }

    this.boxes.clear()
    this.disableAllTasks()
    this.stopIfIdle()
    this.emitState()
  }

  get(id: number): MovingBox | undefined {
    return this.boxes.get(id)
  }

  getAll(): MovingBox[] {
    return Array.from(this.boxes.values())
  }

  getState(): MovingBoxDemoState {
    return {
      frameTaskEnabled: this.frameTaskEnabled,
      frameWorkMs: this.frameWorkMs,
      longTaskEnabled: this.longTaskEnabled,
      longTaskWorkMs: this.longTaskWorkMs,
      runningBoxes: this.boxes.size,
    }
  }

  subscribe(listener: MovingBoxStateListener): () => void {
    this.stateListeners.add(listener)
    listener(this.getState())

    let subscribed = true

    return () => {
      if (!subscribed) {
        return
      }

      subscribed = false
      this.stateListeners.delete(listener)
    }
  }

  setFrameWorkMs(duration: number): void {
    // 单帧负载限制在 32ms 内，既能模拟掉帧，又避免误操作造成页面长时间无响应。
    this.frameWorkMs = Math.max(0, Math.min(duration, 32))
    this.emitState()
  }

  setFrameTaskEnabled(enabled: boolean): void {
    const nextEnabled = enabled && this.boxes.size > 0

    if (this.frameTaskEnabled === nextEnabled) {
      return
    }

    this.frameTaskEnabled = nextEnabled
    this.emitState()
  }

  setLongTaskWorkMs(duration: number): void {
    // 长任务允许更高上限以触发 LoAF，但仍设硬限制保护演示页面。
    this.longTaskWorkMs = Math.max(0, Math.min(duration, 500))
    this.emitState()
  }

  setLongTaskEnabled(enabled: boolean): void {
    const nextEnabled = enabled && this.boxes.size > 0

    if (this.longTaskEnabled === nextEnabled) {
      return
    }

    this.longTaskEnabled = nextEnabled
    if (nextEnabled) {
      this.scheduleLongTask()
    } else {
      this.clearLongTask()
    }
    this.emitState()
  }

  private start(): void {
    if (this.animationId !== null) {
      return
    }

    this.animationId = requestAnimationFrame(this.tick)
  }

  private tick = (): void => {
    for (const box of this.boxes.values()) {
      this.updateBox(box)
    }

    if (this.frameTaskEnabled) {
      this.runCpuTask(this.frameWorkMs)
    }

    if (this.boxes.size === 0) {
      this.animationId = null
      return
    }

    this.animationId = requestAnimationFrame(this.tick)
  }

  private updateBox(box: MovingBox): void {
    const { minX, maxX, minY, maxY } = this.getMovementBounds(box.size)

    box.x += box.speedX
    box.y += box.speedY

    if (box.x <= minX || box.x >= maxX) {
      box.speedX *= -1
    }

    if (box.y <= minY || box.y >= maxY) {
      box.speedY *= -1
    }

    box.x = Math.max(minX, Math.min(box.x, maxX))
    box.y = Math.max(minY, Math.min(box.y, maxY))
    box.el.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`
  }

  private getMovementBounds(size: number) {
    const maxX = Math.max(window.innerWidth - size, 0)
    const maxY = Math.max(window.innerHeight - size, 0)

    // 将动画限制在右下半区，避免遮挡左上方页面内容和控制区。
    return {
      minX: Math.min(window.innerWidth / 2, maxX),
      maxX,
      minY: Math.min(window.innerHeight / 2, maxY),
      maxY,
    }
  }

  private stop(): void {
    if (this.animationId === null) {
      return
    }

    cancelAnimationFrame(this.animationId)
    this.animationId = null
  }

  private stopIfIdle(): void {
    if (this.boxes.size === 0) {
      this.stop()
    }
  }

  private runCpuTask(duration: number): void {
    const startedAt = performance.now()
    let value = this.cpuAccumulator

    // busy loop 是刻意阻塞主线程；累加值可阻止引擎把循环视为无副作用而优化掉。
    while (performance.now() - startedAt < duration) {
      value = Math.sqrt(value * value + 1.000001)
    }

    this.cpuAccumulator = value
  }

  private scheduleLongTask(): void {
    if (!this.longTaskEnabled || this.boxes.size === 0 || this.longTaskTimerId !== null) {
      return
    }

    // 递归 setTimeout 从上次任务结束后再计时，避免 setInterval 在阻塞后集中补触发。
    this.longTaskTimerId = window.setTimeout(() => {
      this.longTaskTimerId = null

      if (!this.longTaskEnabled || this.boxes.size === 0) {
        return
      }

      this.runCpuTask(this.longTaskWorkMs)
      this.scheduleLongTask()
    }, LONG_TASK_INTERVAL)
  }

  private clearLongTask(): void {
    if (this.longTaskTimerId === null) {
      return
    }

    window.clearTimeout(this.longTaskTimerId)
    this.longTaskTimerId = null
  }

  private disableAllTasks(): void {
    this.frameTaskEnabled = false
    this.longTaskEnabled = false
    this.clearLongTask()
  }

  private emitState(): void {
    for (const listener of this.stateListeners) {
      listener(this.getState())
    }
  }

  private randomDirection(): 1 | -1 {
    return Math.random() > 0.5 ? 1 : -1
  }
}

export function createPerformanceSimulationManager() {
  return new PerformanceSimulationManager()
}
