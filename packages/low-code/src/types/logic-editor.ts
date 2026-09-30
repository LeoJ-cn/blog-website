import type { GraphData } from '@antv/g6'
import type { SimpleProcessData } from './process'

/** 编辑器内部三类画布的隔离快照；方法详情必须使用稳定方法 ID 作为键。 */
export interface LogicEditorGraphSnapshot {
  /** 方法入口列表画布。 */
  methodListGraph: GraphData | null
  /** 各方法的详情画布，键为 `Method.id`。 */
  methodDetailGraphs: Record<string, GraphData>
  /** 页面变量画布。 */
  variableGraph: GraphData | null
}

/** 方法列表画布中一条已建立的“生命周期 → 方法”绑定。 */
export interface LogicEditorLifecycleBinding {
  /** 生命周期协议值，用于运行时识别触发阶段，例如 `created`。 */
  lifecycle: string
  /** 生命周期在编辑器中的中文名称，例如“页面创建时”。 */
  label: string
  /** 按连线顺序执行的方法 ID；顺序变化会影响运行时调用顺序。 */
  methodIds: string[]
}

/** 逻辑编辑器一次成功保存产生的同源结果。 */
export interface LogicEditorSavePayload {
  /** 本次被翻译的方法详情图，不是方法列表图或变量图。 */
  graphData: GraphData
  /** 由 `graphData` 翻译得到的旧运行时流程节点。 */
  processData: SimpleProcessData[]
  /** 由同一份 `graphData` 生成的 Blockly XML。 */
  blockData: string
  /**
   * 按稳定方法 ID 分组的流程数据。
   * 生命周期绑定中的 `methodIds` 可直接与这里的 `methodId` 对应。
   */
  processDataByMethod: Array<{
    /** `Method.id`，用于关联生命周期和方法调用。 */
    methodId: string
    /** 优先使用方法中文名称，缺失时回退到函数名。 */
    methodName: string
    /** 当前方法独立翻译得到的旧运行时流程节点。 */
    processData: SimpleProcessData[]
  }>
  /** 方法列表画布中已连接的生命周期绑定；未连接时为空数组。 */
  lifecycleBindings: LogicEditorLifecycleBinding[]
}
