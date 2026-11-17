import { useId } from 'react'
import './LeoCheckBox.css'

export interface LeoCheckBoxProps {
  label?: string
  checked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

export function LeoCheckBox({ label, checked, disabled, onChange }: LeoCheckBoxProps) {
  const id = useId()
  return (
    <div className="leo-checkbox">
      <input
        id={id}
        className="leo-checkbox__input"
        type="checkbox"
        checked={checked ?? false}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      {label ? (
        <label className="leo-checkbox__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
    </div>
  )
}
