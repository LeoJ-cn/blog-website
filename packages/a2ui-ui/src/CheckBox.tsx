import { useId } from 'react'
import './CheckBox.css'

export interface CheckBoxProps {
  label?: string
  checked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

export function CheckBox({ label, checked, disabled, onChange }: CheckBoxProps) {
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
