import { computed, ref } from 'vue'
import type { GisDatasetScale } from '../persistence/dataset-scale'
import { WORKSPACE_SCENE_META, type WorkspaceScene } from '../components/workspace/workspace-types'

export type WorkspaceInitializationState =
  | 'loading' // 正在打开当前量级的本地数据库，交互入口暂时禁用。
  | 'ready' // 数据与地图运行时均已就绪，可以接受用户操作。
  | 'error' // 本地数据恢复失败，需要用户通过工作台入口重试。

interface UseGisWorkspaceOptions {
  applyScene: (scene: WorkspaceScene) => void
  persistDatasetScale: (nextScale: GisDatasetScale, previousScale: GisDatasetScale) => Promise<void>
  retryInitialization: () => void
}

/** 管理工作台级状态；共享运行时仍由页面父组件创建和销毁。 */
export function useGisWorkspace(options: UseGisWorkspaceOptions) {
  const workspaceScene = ref<WorkspaceScene>('realtime')
  const activeSceneMeta = computed(() => WORKSPACE_SCENE_META[workspaceScene.value])
  const activeDatasetScale = ref<GisDatasetScale>('10k')
  const pendingDatasetScale = ref<GisDatasetScale>('10k')
  const initializationState = ref<WorkspaceInitializationState>('loading')
  const initializationError = ref('')
  const persistenceFeedback = ref('')

  function changeWorkspaceScene(scene: WorkspaceScene): void {
    workspaceScene.value = scene
    options.applyScene(scene)
  }

  async function changeDatasetScale(): Promise<void> {
    const previousScale = activeDatasetScale.value
    if (pendingDatasetScale.value === previousScale) return
    try {
      await options.persistDatasetScale(pendingDatasetScale.value, previousScale)
    } catch (error) {
      pendingDatasetScale.value = previousScale
      initializationError.value = error instanceof Error ? error.message : '数据量级保存失败，页面未刷新'
    }
  }

  function retryWorkspaceInitialization(): void {
    if (initializationState.value === 'loading') return
    options.retryInitialization()
  }

  return {
    workspaceScene,
    activeSceneMeta,
    activeDatasetScale,
    pendingDatasetScale,
    initializationState,
    initializationError,
    persistenceFeedback,
    changeWorkspaceScene,
    changeDatasetScale,
    retryWorkspaceInitialization,
  }
}
