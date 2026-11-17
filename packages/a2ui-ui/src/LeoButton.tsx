import type { ReactNode } from 'react'
import './LeoButton.css'

export interface LeoButtonProps {
  variant?: 'default' | 'primary' | 'borderless'
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}

export function LeoButton({ variant = 'default', disabled, onClick, children }: LeoButtonProps) {
  return (
    <button
      type="button"
      className={`leo-btn leo-btn--${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
