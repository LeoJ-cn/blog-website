import { ref } from 'vue'
import type { OperationLog } from './types'

export function useExperimentLog() {
  const logs = ref<OperationLog[]>([])
  let nextId = 0

  function addLog(message: string) {
    logs.value.unshift({
      id: ++nextId,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      message,
    })
    logs.value = logs.value.slice(0, 12)
  }

  return { logs, addLog }
}
