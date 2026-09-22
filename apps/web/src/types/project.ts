export type ProjectCategory = 'performance' | 'browser'
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
