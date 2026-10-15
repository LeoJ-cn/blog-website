import { computed, onScopeDispose, ref } from 'vue'
import type { TrackPlaybackSpeed, TrackPlaybackStatus, TrackPoint } from '../types/track'

/** 回放领域只依赖地图管理器的窄接口，避免 composable 获得其他地图控制权限。 */
export interface TrackPlaybackController {
  playTrack(): void
  pauseTrack(): void
  resetTrack(): void
  setTrackSpeed(speed: TrackPlaybackSpeed): void
  /** progress 是闭区间 [0, 1] 的归一化进度。 */
  seekTrack(progress: number): void
}

interface UseTrackPlaybackOptions {
  /** 轨迹点按 timestamp 升序；lng/lat 分别为 WGS84 经度和纬度。 */
  points: readonly TrackPoint[]
  getController: () => TrackPlaybackController | null
}

function calculateSegmentDistanceKm(start: TrackPoint, end: TrackPoint): number {
  const earthRadiusKm = 6371.0088
  const toRadians = (value: number) => (value * Math.PI) / 180
  const startLatitude = toRadians(start.lat)
  const endLatitude = toRadians(end.lat)
  const latitudeDelta = endLatitude - startLatitude
  const longitudeDelta = toRadians(end.lng - start.lng)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine))
}

function calculateTrackDistanceKm(points: readonly TrackPoint[]): number {
  let distanceKilometers = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    distanceKilometers += calculateSegmentDistanceKm(points[index]!, points[index + 1]!)
  }
  return distanceKilometers
}

export function formatTrackDuration(durationMs: number): string {
  const totalSeconds = Math.round(Math.max(0, durationMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatTrackGridLabel(sequence: number): string {
  const row = Math.floor(sequence / 4)
  const routeColumn = sequence % 4
  // 奇数行按蛇形路线从东向西行进，转换回网格从西向东的一基列号。
  const column = row % 2 === 0 ? routeColumn : 3 - routeColumn
  return `GRID-${row + 1}-${column + 1}`
}

/** 管理轨迹回放状态、派生指标和对地图回放控制器的窄调用。 */
export function useTrackPlayback(options: UseTrackPlaybackOptions) {
  const trackSpeed = ref<TrackPlaybackSpeed>(1)
  const trackStatus = ref<TrackPlaybackStatus>('idle')
  /** 当前轨迹时间是 Unix 毫秒时间戳，空轨迹时为 0。 */
  const trackTime = ref(options.points[0]?.timestamp ?? 0)
  /** 最新待提交进度是闭区间 [0, 1]；同一绘制帧只提交最后一次输入。 */
  let pendingSeekRatio: number | null = null
  let seekFrameId: number | null = null

  const formattedTrackTime = computed(() =>
    new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(trackTime.value),
  )
  const trackTotalDurationMs = computed(() => {
    const start = options.points[0]?.timestamp ?? 0
    const end = options.points.at(-1)?.timestamp ?? start
    return Math.max(0, end - start)
  })
  const trackProgressPercent = computed(() => {
    const start = options.points[0]?.timestamp ?? 0
    if (trackTotalDurationMs.value <= 0) return 0
    return Math.min(100, Math.max(0, ((trackTime.value - start) / trackTotalDurationMs.value) * 100))
  })
  const trackElapsedMs = computed(() => {
    const start = options.points[0]?.timestamp ?? 0
    return Math.min(trackTotalDurationMs.value, Math.max(0, trackTime.value - start))
  })
  const trackActiveGridSequence = computed(() => {
    let activeSequence = 0
    for (let index = 0; index < options.points.length; index += 1) {
      if (trackTime.value < options.points[index]!.timestamp) break
      activeSequence = index
    }
    return activeSequence
  })
  const trackCoveredGridCount = computed(() =>
    Math.min(options.points.length, trackActiveGridSequence.value + 1),
  )
  const trackActiveGridLabel = computed(() => formatTrackGridLabel(trackActiveGridSequence.value))
  const trackTotalDistanceKm = computed(() => calculateTrackDistanceKm(options.points))
  const trackCompletedDistanceKm = computed(() => {
    if (options.points.length < 2) return 0
    let completedKilometers = 0
    for (let index = 0; index < options.points.length - 1; index += 1) {
      const start = options.points[index]!
      const end = options.points[index + 1]!
      if (trackTime.value >= end.timestamp) {
        completedKilometers += calculateSegmentDistanceKm(start, end)
        continue
      }
      if (trackTime.value > start.timestamp && end.timestamp > start.timestamp) {
        // 当前采样段按时间比例估算已完成距离，比例限制在闭区间 [0, 1]。
        const ratio = Math.min(1, Math.max(0, (trackTime.value - start.timestamp) / (end.timestamp - start.timestamp)))
        completedKilometers += calculateSegmentDistanceKm(start, end) * ratio
      }
      break
    }
    return completedKilometers
  })

  function updateState(timestamp: number, status: TrackPlaybackStatus): void {
    trackTime.value = timestamp
    trackStatus.value = status
  }
  function play(): void { options.getController()?.playTrack() }
  function pause(): void { options.getController()?.pauseTrack() }
  function reset(): void { options.getController()?.resetTrack() }
  function changeSpeed(speed: TrackPlaybackSpeed): void {
    trackSpeed.value = speed
    options.getController()?.setTrackSpeed(speed)
  }
  function seek(progressPercent: number): void {
    pendingSeekRatio = Math.min(1, Math.max(0, progressPercent / 100))
    if (seekFrameId !== null) return
    seekFrameId = requestAnimationFrame(() => {
      seekFrameId = null
      const ratio = pendingSeekRatio
      pendingSeekRatio = null
      if (ratio !== null) options.getController()?.seekTrack(ratio)
    })
  }
  function seekCheckpoint(sequence: number): void {
    const lastSequence = options.points.length - 1
    if (lastSequence <= 0) return
    options.getController()?.seekTrack(Math.min(lastSequence, Math.max(0, sequence)) / lastSequence)
  }

  onScopeDispose(() => {
    if (seekFrameId !== null) cancelAnimationFrame(seekFrameId)
    seekFrameId = null
    pendingSeekRatio = null
  })

  return {
    trackSpeed, trackStatus, trackTime, formattedTrackTime, trackProgressPercent,
    trackTotalDurationMs, trackElapsedMs, trackActiveGridSequence, trackCoveredGridCount,
    trackActiveGridLabel, trackTotalDistanceKm, trackCompletedDistanceKm,
    play, pause, reset, changeSpeed, seek, seekCheckpoint, updateState,
  }
}
