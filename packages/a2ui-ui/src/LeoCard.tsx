import type { ReactNode } from 'react'
import './LeoCard.css'

export interface LeoCardProps {
  children: ReactNode
  borderColor?: 'default' | 'danger' | 'warning'
}

export function LeoCard({ children, borderColor = 'default' }: LeoCardProps) {
  return <div className={`leo-card leo-card--border-${borderColor}`}>{children}</div>
}
