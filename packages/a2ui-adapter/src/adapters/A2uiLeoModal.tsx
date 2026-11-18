import { useState } from 'react'
import { LeoModalApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoButton, LeoModal, LeoText } from '@white55/a2ui-ui'

/**
 * 弹窗适配器。
 *
 * 契约里没有 trigger —— 那是 basic catalog 的字段，而渲染器的 buildChild
 * 无法给子节点注入 onClick，实际做不到。改成由后端给 label，适配层渲染入口按钮，
 * 这是契约层面就写明的设计，不是实现层面的降级。
 */
export const A2uiLeoModal = createComponentImplementation(
  LeoModalApi,
  ({ props, buildChild }) => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <LeoButton variant="default" onClick={() => setOpen(true)}>
          {props.label ?? '打开'}
        </LeoButton>
        <LeoModal
          open={open}
          onOpenChange={setOpen}
          title={typeof props.title === 'string' ? props.title : '详情'}
        >
          {props.content ? buildChild(props.content) : <LeoText variant="body">无内容</LeoText>}
        </LeoModal>
      </>
    )
  },
)
