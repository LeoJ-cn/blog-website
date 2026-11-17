import { useId } from 'react'
import './TextField.css'

export interface TextFieldProps {
  label?: string
  value?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  onChange?: (value: string) => void
}

export function TextField({
  label,
  value,
  placeholder,
  disabled,
  invalid,
  onChange,
}: TextFieldProps) {
  const id = useId()
  return (
    <div className={`leo-field${invalid ? ' leo-field--invalid' : ''}`}>
      {label ? (
        <label className="leo-field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className="leo-field__input"
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  )
}
