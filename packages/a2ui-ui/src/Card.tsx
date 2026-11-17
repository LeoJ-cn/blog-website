import type { ReactNode } from 'react'
import './Card.css'

export interface CardProps {
  children: ReactNode
  borderColor?: 'default' | 'danger' | 'warning'
}

export function Card({ children, borderColor = 'default' }: CardProps) {
  return <div className={`leo-card leo-card--border-${borderColor}`}>{children}</div>
}
