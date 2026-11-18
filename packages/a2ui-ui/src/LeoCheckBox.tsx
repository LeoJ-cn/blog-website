import { useId } from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import './LeoCheckBox.css'

export interface LeoCheckBoxProps {
  label?: string
  /** 勾选状态；传 undefined 表示非受控，由组件内部自己维护 */
  checked?: boolean
  /**
   * 半选态：用于「部分子项已选」的父级勾选框。
   * 语义上不算全选，`aria-checked` 会是 "mixed"，读屏器会单独播报。
   */
  indeterminate?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

/**
 * 基于 Radix Checkbox 的勾选框。
 *
 * 不用原生 `<input type="checkbox">` 的原因：原生控件的 indeterminate 只能在 JS 里
 * 通过 DOM 属性设置，React 没有对应 prop；Radix 把它变成受控的一等状态，
 * 无障碍属性（aria-checked="mixed"）与键盘交互也一并处理好了。
 */
export function LeoCheckBox({
  label,
  checked,
  indeterminate = false,
  disabled,
  onChange,
}: LeoCheckBoxProps) {
  const id = useId()
  // Radix 的 onCheckedChange 参数是 boolean | 'indeterminate'，这里只关心选中与否
  const state = indeterminate ? 'indeterminate' : checked === true

  return (
    <div className="leo-checkbox">
      <Checkbox.Root
        id={id}
        className="leo-checkbox__root"
        checked={state}
        disabled={disabled}
        onCheckedChange={(next) => onChange?.(next === true)}
      >
        <Checkbox.Indicator className="leo-checkbox__indicator">
          {indeterminate ? (
            // 半选用一条横线，与全选的勾形区分开
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2.5 6.2 4.9 8.5 9.5 3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label ? (
        <label className="leo-checkbox__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
    </div>
  )
}
