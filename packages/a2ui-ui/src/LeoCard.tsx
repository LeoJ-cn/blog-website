import type { ReactNode } from 'react'
import './LeoCard.css'

/**
 * 卡片描边语义。
 *
 * 这些值在协议层（LeoCardApi 的 tone）与组件层（borderColor）必须一一对应，
 * 少一个就会导致后端能下发、前端却渲染成默认色而无人察觉。
 */
export const CARD_BORDER_TONES = ['default', 'warning', 'danger', 'brand'] as const
export type CardBorderTone = (typeof CARD_BORDER_TONES)[number]

export interface LeoCardProps {
  children?: ReactNode
  borderColor?: CardBorderTone
}

export function LeoCard({ children, borderColor = 'default' }: LeoCardProps) {
  return <div className={`leo-card leo-card--border-${borderColor}`}>{children}</div>
}
