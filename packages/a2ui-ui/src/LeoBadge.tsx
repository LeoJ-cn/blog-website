import type { ReactNode } from 'react'
import './LeoBadge.css'

/**
 * 徽标语义色。
 *
 * 每个值对应一组「浅底 + 深字」，由 tokens 里的 --leo-*-bg / --leo-* 提供；
 * 不要让调用方传任意颜色，否则同一屏里会出现语义相同但色不一致的标签。
 */
export const BADGE_TONES = ['neutral', 'warning', 'danger', 'success', 'brand', 'outline'] as const
export type BadgeTone = (typeof BADGE_TONES)[number]

export interface LeoBadgeProps {
  children: ReactNode
  tone?: BadgeTone
  /**
   * 虚线描边样式。
   *
   * 截图里的「演示」标记用虚线框表示「这不是真实数据」，
   * 语义上不同于普通的实心标签，因此做成独立开关而不是又一个 tone。
   */
  dashed?: boolean
}

export function LeoBadge({ children, tone = 'neutral', dashed = false }: LeoBadgeProps) {
  return (
    <span className={`leo-badge leo-badge--${tone}${dashed ? ' leo-badge--dashed' : ''}`}>
      {children}
    </span>
  )
}
