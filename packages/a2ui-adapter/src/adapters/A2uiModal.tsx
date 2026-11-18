import { useState } from 'react'
import { ModalApi, createComponentImplementation } from '../protocol'
import { LeoButton, LeoModal, LeoText } from '@white55/a2ui-ui'

/**
 * Modal 适配器。
 *
 * A2UI 契约里 `trigger` 指向「点击后打开弹窗的组件」，但渲染器的 buildChild 只能按 id
 * 解析子树，无法给那个子节点注入 onClick——回调不在数据模型里，也不属于组件 props。
 *
 * 因此这里退一步：把 trigger 子树原样渲染作为可见内容，另配一个由适配层提供的
 * 「打开」按钮驱动弹层。这是适配层对协议的一条明确限制，不是遗漏；
 * 要支持真正的 trigger 绑定，需要 web_core 暴露「向指定子节点注入事件」的能力。
 */
export const A2uiModal = createComponentImplementation(ModalApi, ({ props, buildChild }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      {props.trigger ? buildChild(props.trigger) : null}
      <LeoButton variant="default" onClick={() => setOpen(true)}>
        打开弹窗
      </LeoButton>
      <LeoModal open={open} onOpenChange={setOpen} title="详情">
        {props.content ? buildChild(props.content) : <LeoText variant="body">无内容</LeoText>}
      </LeoModal>
    </>
  )
})
