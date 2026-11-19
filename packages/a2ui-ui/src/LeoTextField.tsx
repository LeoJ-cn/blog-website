import { useId } from 'react'
import './LeoTextField.css'

export interface LeoTextFieldProps {
  label?: string
  value?: string
  /** 输入形态：单行输入框或可换行的多行文本域 */
  variant?: 'text' | 'textarea'
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** 校验失败文案；为空时不渲染错误行，仅由 invalid 控制描边 */
  errorText?: string
  onChange?: (value: string) => void
}

export function LeoTextField({
  label,
  value,
  variant = 'text',
  placeholder,
  disabled,
  invalid,
  errorText,
  onChange,
}: LeoTextFieldProps) {
  const id = useId()
  return (
    <div className={`leo-field${invalid ? ' leo-field--invalid' : ''}`}>
      {label ? (
        <label className="leo-field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {variant === 'textarea' ? (
        <textarea
          id={id}
          className="leo-field__input leo-field__input--textarea"
          value={value ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange?.(event.target.value)}
        />
      ) : (
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
      )}
      {errorText ? <div className="leo-field__error">{errorText}</div> : null}
    </div>
  )
}
