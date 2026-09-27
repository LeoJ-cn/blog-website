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
  cpuTaskEnabled: boolean
  cpuWorkMs: number
  runningBoxes: number
}

export type MovingBoxStateListener = (state: MovingBoxDemoState) => void

export const CPU_PRESSURE_OPTIONS = [2, 4, 6, 12, 24] as const

class MovingBoxManager {
  private boxes = new Map<number, MovingBox>()
  private animationId: number | null = null
  private idCounter = 0
  private cpuTaskEnabled = false
  private cpuWorkMs: number = CPU_PRESSURE_OPTIONS[0]
  private cpuAccumulator = 0
  private taskIdsByBox = new Map<number, Set<number>>()
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
    if (this.cpuTaskEnabled) {
      this.scheduleCpuTask(id)
    }
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
    this.clearCpuTasks(id)

    if (this.boxes.size === 0) {
      this.cpuTaskEnabled = false
      this.clearAllCpuTasks()
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
    this.cpuTaskEnabled = false
    this.clearAllCpuTasks()
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
      cpuTaskEnabled: this.cpuTaskEnabled,
      cpuWorkMs: this.cpuWorkMs,
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

  setCpuWorkMs(duration: number): void {
    this.cpuWorkMs = Math.max(0, Math.min(duration, 64))
    this.emitState()
  }

  setCpuTaskEnabled(enabled: boolean): void {
    const nextEnabled = enabled && this.boxes.size > 0

    if (this.cpuTaskEnabled === nextEnabled) {
      return
    }

    this.cpuTaskEnabled = nextEnabled

    if (nextEnabled) {
      for (const boxId of this.boxes.keys()) {
        this.scheduleCpuTask(boxId)
      }
    } else {
      this.clearAllCpuTasks()
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

    while (performance.now() - startedAt < duration) {
      value = Math.sqrt(value * value + 1.000001)
    }

    this.cpuAccumulator = value
  }

  private scheduleCpuTask(boxId: number): void {
    const taskIds = new Set<number>()
    this.taskIdsByBox.set(boxId, taskIds)
    this.scheduleCpuTaskLoop(boxId, taskIds)
  }

  private scheduleCpuTaskLoop(boxId: number, taskIds: Set<number>): void {
    if (!this.boxes.has(boxId) || !this.taskIdsByBox.has(boxId)) {
      return
    }

    const taskId = window.setTimeout(() => {
      taskIds.delete(taskId)

      if (!this.boxes.has(boxId) || !this.taskIdsByBox.has(boxId)) {
        return
      }

      this.runCpuTask(this.cpuWorkMs)

      this.scheduleCpuTaskLoop(boxId, taskIds)
    }, 0)

    taskIds.add(taskId)
  }

  private clearCpuTasks(boxId: number): void {
    const taskIds = this.taskIdsByBox.get(boxId)

    if (!taskIds) {
      return
    }

    for (const taskId of taskIds) {
      window.clearTimeout(taskId)
    }

    this.taskIdsByBox.delete(boxId)
  }

  private clearAllCpuTasks(): void {
    for (const boxId of this.taskIdsByBox.keys()) {
      this.clearCpuTasks(boxId)
    }
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

export const movingBoxManager = new MovingBoxManager()
