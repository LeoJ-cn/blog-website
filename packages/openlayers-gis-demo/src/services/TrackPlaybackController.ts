import type Feature from 'ol/Feature.js'
import type Point from 'ol/geom/Point.js'
import type { ProjectedTrackPoint } from '../map/layers/create-track-layer'
import type { TrackPlaybackSpeed, TrackPlaybackStatus } from '../types/track'

interface Options {
  /** 动画过程中持续复用的人员位置 Feature。 */
  personFeature: Feature<Point>
  /** 已投影轨迹点，按 timestamp 严格升序排列。 */
  points: readonly ProjectedTrackPoint[]
  /** 每帧返回插值后的巡检时间，单位为 Unix 毫秒时间戳。 */
  onTimeChange?: (timestamp: number, status: TrackPlaybackStatus) => void
}

export class TrackPlaybackController {
  private frameId: number | null = null
  private status: TrackPlaybackStatus = 'idle'
  private speed: TrackPlaybackSpeed = 1
  private elapsed = 0
  private frameStartedAt = 0
  private segmentIndex = 0

  constructor(private readonly options: Options) {
    this.reset()
  }

  /** 从当前位置继续播放；重复调用不会创建第二条动画循环。 */
  play(): void {
    if (this.status === 'playing' || this.options.points.length < 2) return
    if (this.status === 'finished') this.reset()
    this.status = 'playing'
    this.frameStartedAt = performance.now()
    this.frameId = requestAnimationFrame(this.tick)
  }

  /** 停止帧循环但保留当前轨迹时间和人员位置。 */
  pause(): void {
    if (this.status !== 'playing') return
    this.commitElapsed(performance.now())
    // 暂停发生在两帧之间时也要把位置推进到精确暂停时刻，避免时间与图标轻微错位。
    this.updatePosition(this.elapsed)
    this.cancelFrame()
    this.status = 'paused'
    this.emitTime()
  }

  /** 回到第一个轨迹点，并清除已经累计的播放时间。 */
  reset(): void {
    this.cancelFrame()
    this.elapsed = 0
    this.segmentIndex = 0
    this.status = 'idle'
    const first = this.options.points[0]
    if (first) this.options.personFeature.getGeometry()?.setCoordinates(first.coordinate)
    this.emitTime()
  }

  /** 设置时间倍率；播放中切换时先结算旧倍率，避免位置发生跳变。 */
  setSpeed(speed: TrackPlaybackSpeed): void {
    if (this.status === 'playing') {
      this.commitElapsed(performance.now())
      this.frameStartedAt = performance.now()
    }
    this.speed = speed
  }

  destroy(): void {
    this.cancelFrame()
  }

  private readonly tick = (now: number) => {
    const duration = this.getDuration()
    const currentElapsed = Math.min(
      duration,
      this.elapsed + (now - this.frameStartedAt) * this.speed,
    )
    this.updatePosition(currentElapsed)
    if (currentElapsed >= duration) {
      this.elapsed = duration
      this.status = 'finished'
      this.frameId = null
      this.emitTime()
      return
    }
    this.frameId = requestAnimationFrame(this.tick)
  }

  private updatePosition(elapsed: number): void {
    const points = this.options.points
    const targetTimestamp = (points[0]?.timestamp ?? 0) + elapsed
    while (
      this.segmentIndex < points.length - 2 &&
      points[this.segmentIndex + 1]!.timestamp < targetTimestamp
    ) {
      this.segmentIndex += 1
    }
    const start = points[this.segmentIndex]
    const end = points[this.segmentIndex + 1]
    if (!start || !end) return
    // ratio 限制在闭区间 [0, 1]，避免计时误差把人员位置推到线段之外。
    const ratio = Math.min(
      1,
      Math.max(0, (targetTimestamp - start.timestamp) / (end.timestamp - start.timestamp)),
    )
    const coordinate: [number, number] = [
      start.coordinate[0] + (end.coordinate[0] - start.coordinate[0]) * ratio,
      start.coordinate[1] + (end.coordinate[1] - start.coordinate[1]) * ratio,
    ]
    this.options.personFeature.getGeometry()?.setCoordinates(coordinate)
    this.options.onTimeChange?.(targetTimestamp, this.status)
  }

  private commitElapsed(now: number): void {
    this.elapsed = Math.min(
      this.getDuration(),
      this.elapsed + (now - this.frameStartedAt) * this.speed,
    )
  }

  private getDuration(): number {
    const first = this.options.points[0]?.timestamp ?? 0
    const last = this.options.points.at(-1)?.timestamp ?? first
    return Math.max(0, last - first)
  }

  private emitTime(): void {
    const timestamp = (this.options.points[0]?.timestamp ?? 0) + this.elapsed
    this.options.onTimeChange?.(timestamp, this.status)
  }

  private cancelFrame(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
  }
}
