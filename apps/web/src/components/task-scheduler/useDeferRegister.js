import { ref, onMounted, onUnmounted } from 'vue'
import { scheduler } from './task-scheduler.js'
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
    isReady.value = false

    // restart 可能在旧任务执行前被多次调用；先撤销可保证一个组件最多保留一个排队任务。
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
    // 防止组件销毁后排队回调仍修改已失去消费者的响应式状态。
    resetState()
  })

  return {
    isReady,
    restart: doRegister,
  }
}
