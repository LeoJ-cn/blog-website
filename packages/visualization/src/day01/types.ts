export type RendererKind = 'canvas' | 'svg'

/** setOption 的三种学习模式；replaceMerge 仅替换 series 主类型。 */
export type UpdateMode = 'merge' | 'notMerge' | 'replaceMerge'

export interface OperationLog {
  id: number
  /** 记录产生的本地时间，仅用于页面实验观察。 */
  time: string
  message: string
}
