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

/** 逻辑编辑器一次成功保存产生的同源结果。 */
export interface LogicEditorSavePayload {
  /** 本次被翻译的方法详情图，不是方法列表图或变量图。 */
  graphData: GraphData
  /** 由 `graphData` 翻译得到的旧运行时流程节点。 */
  processData: SimpleProcessData[]
  /** 由同一份 `graphData` 生成的 Blockly XML。 */
  blockData: string
}
