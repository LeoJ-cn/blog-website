import type { ReactNode } from 'react'
import './Button.css'

export interface ButtonProps {
  variant?: 'default' | 'primary' | 'borderless'
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}

export function Button({ variant = 'default', disabled, onClick, children }: ButtonProps) {
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
