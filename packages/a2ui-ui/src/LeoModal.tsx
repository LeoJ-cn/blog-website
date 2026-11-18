import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import './LeoModal.css'

export interface LeoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  /** 关闭按钮的无障碍名称；读屏器会念出来，不能省略 */
  closeLabel?: string
}

/**
 * 基于 Radix Dialog 的模态框。
 *
 * 用 Radix 而不是自己撸一层遮罩：焦点陷阱、Esc 关闭、点击遮罩关闭、
 * 打开时锁滚动、关闭后焦点归还触发元素——这些手写极易漏项，
 * 漏掉任意一项都会让键盘用户被困在页面里出不去。
 */
export function LeoModal({
  open,
  onOpenChange,
  title,
  children,
  closeLabel = '关闭',
}: LeoModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="leo-modal__overlay" />
        <Dialog.Content className="leo-modal__content">
          <div className="leo-modal__header">
            <Dialog.Title className="leo-modal__title">{title}</Dialog.Title>
            <Dialog.Close className="leo-modal__close" aria-label={closeLabel}>
              <span aria-hidden="true">×</span>
            </Dialog.Close>
          </div>
          <div className="leo-modal__body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
