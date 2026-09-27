import type { FramePerformanceMonitor, FramePerformanceSnapshot } from '@blog/monitoring'
import { onUnmounted, readonly, ref, type Ref } from 'vue'

const DEFAULT_RECORDING_DURATION = 5

export interface UsePerformancePanelOptions {
  recordingDuration?: number
}

export interface UsePerformancePanelResult {
  snapshot: Readonly<Ref<FramePerformanceSnapshot>>
  recordedSnapshots: Readonly<Ref<readonly FramePerformanceSnapshot[]>>
  recording: Readonly<Ref<boolean>>
  recordingSecondsLeft: Readonly<Ref<number>>
  startRecording: () => void
}

export function usePerformancePanel(
  monitor: FramePerformanceMonitor,
  options: UsePerformancePanelOptions = {},
): UsePerformancePanelResult {
  const recordingDuration = Math.max(
    1,
    Math.floor(options.recordingDuration ?? DEFAULT_RECORDING_DURATION),
  )
  const snapshot = ref<FramePerformanceSnapshot>(monitor.getSnapshot())
  const recordedSnapshots = ref<FramePerformanceSnapshot[]>([])
  const recording = ref(false)
  const recordingSecondsLeft = ref(0)
  let pendingSnapshots: FramePerformanceSnapshot[] = []

  const unsubscribe = monitor.subscribe((nextSnapshot) => {
    snapshot.value = nextSnapshot

    if (!recording.value || nextSnapshot.status !== 'running' || nextSnapshot.sample.duration <= 0) {
      return
    }

    pendingSnapshots.push({
      ...nextSnapshot,
      sample: { ...nextSnapshot.sample },
      target: nextSnapshot.target ? { ...nextSnapshot.target } : null,
      longAnimationFrames: nextSnapshot.longAnimationFrames
        ? { ...nextSnapshot.longAnimationFrames }
        : null,
    })
    recordingSecondsLeft.value = Math.max(0, recordingDuration - pendingSnapshots.length)

    if (pendingSnapshots.length < recordingDuration) {
      return
    }

    recordedSnapshots.value = pendingSnapshots
    recording.value = false
  })

  function startRecording() {
    pendingSnapshots = []

    recordedSnapshots.value = []
    recording.value = true
    recordingSecondsLeft.value = recordingDuration
    monitor.reset()
  }

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    snapshot: readonly(snapshot),
    recordedSnapshots: readonly(recordedSnapshots),
    recording: readonly(recording),
    recordingSecondsLeft: readonly(recordingSecondsLeft),
    startRecording,
  }
}
