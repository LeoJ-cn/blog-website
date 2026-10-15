export type WorkspaceScene =
  | 'realtime' // 日常监控事件、轨迹和处置状态。
  | 'dispatch' // 展示责任网格并突出任务分派与区域处置。
  | 'replay' // 隐藏事件点，突出巡检轨迹和时间轴复盘。
  | 'analysis' // 绘制几何并执行空间分析，展示结果和已保存记录。

export interface WorkspaceSceneMeta {
  label: string
  description: string
}

export const WORKSPACE_SCENE_META: Readonly<Record<WorkspaceScene, WorkspaceSceneMeta>> = {
  realtime: { label: '实时态势', description: '事件聚合、在线轨迹与处置状态' },
  dispatch: { label: '任务调度', description: '责任网格、精确点位与人员分派' },
  replay: { label: '巡检复盘', description: '巡检路线、时间定位与覆盖核查' },
  analysis: { label: '空间分析', description: '测量、缓冲区、最近事件与区域洞察' },
}
