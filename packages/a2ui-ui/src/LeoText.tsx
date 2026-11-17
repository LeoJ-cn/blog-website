import type { ElementType, ReactNode } from 'react'
import './LeoText.css'

export type TextViewVariant = 'body' | 'caption' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5'

export interface LeoTextProps {
  variant?: TextViewVariant
  children: ReactNode
}

// 标题变体渲染成对应语义标签，其余用 span，保证无障碍与 SEO 语义。
const TAG_BY_VARIANT: Record<TextViewVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  body: 'span',
  caption: 'span',
}

export function LeoText({ variant = 'body', children }: LeoTextProps) {
  const Tag = TAG_BY_VARIANT[variant]
  return <Tag className={`leo-text leo-text--${variant}`}>{children}</Tag>
}
