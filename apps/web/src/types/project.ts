export type ProjectCategory =
  | 'solutions' // 具备完整业务场景和多模块协作的综合解决方案。
  | 'visualization' // 图表、大屏与数据可视化专项学习实验。
  | 'ui' // UI 组件文档与 Storybook 外链，和复杂解决方案平级。
  | 'engineering' // 框架迁移、工程边界与架构演进实践。
  | 'performance' // 加载、调度与运行时性能优化实践。
  | 'browser' // 直接建立在浏览器平台 API 上的交互能力。
export type ProjectStatus = 'active' | 'planned' | 'archived'

export interface ProjectSource {
  label: string
  path: string
  language: string
  content: string
}

export interface ProjectDefinition {
  slug: string
  title: string
  summary: string
  description: string
  category: ProjectCategory
  status: ProjectStatus
  tags: string[]
  featured?: boolean
  updatedAt: string
  sources: ProjectSource[]
}

export interface DemoControlDefinition {
  key: string
  label: string
  type: 'number' | 'range' | 'select' | 'boolean'
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: string }>
}

export interface MetricSnapshot {
  label: string
  value: string | number
  unit?: string
  tone?: 'neutral' | 'positive' | 'warning'
}
