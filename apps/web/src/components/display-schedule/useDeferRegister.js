import { ref, onMounted, onUnmounted } from 'vue'
import { scheduler } from 'index.js'
const schedulerInstance = scheduler

/**
 * @typedef DeferRegisterConfig
 * @property {number} priority 权重，0=立即执行，>0进入排队队列
 * @property {Record<string,any>} [meta] 扩展元信息，用于日志/调试/埋点，透传给scheduler任务
 */

/**
 * @param {DeferRegisterConfig} config
 * @returns {{ isReady: import('vue').Ref<boolean> }}
 */
export function useDeferRegister(config) {
  const { priority = 10, meta = {} } = config ?? {}

  const isReady = ref(false)
  let taskId = null

  function resetState() {
    if (taskId) {
      schedulerInstance.removeTask(taskId)
      taskId = null
    }
  }

  function doRegister() {
    // 已有任务：先移除旧任务，重新注册
    if (taskId) {
      schedulerInstance.removeTask(taskId)
      taskId = null
    }

    taskId = schedulerInstance.register({
      priority,
      meta,
      run: () => {
        isReady.value = true
      },
    })
  }

  // 不再做 priority===0 分支，全部交给 schedulerInstance 内部处理
  onMounted(() => {
    doRegister()
  })

  onUnmounted(() => {
    resetState()
  })

  return {
    isReady,
  }
}
