import { useState } from 'react'
import { LeoButton, LeoTextField } from '@white55/a2ui-ui'

type DemoMode = 'library' | 'builtin' | 'integrated'

const PLACEHOLDER: Record<DemoMode | 'protocol', string> = {
  library: '组件库页直接渲染，发送仅回显…',
  builtin: 'A2UI 自带组件页直接渲染，发送仅回显…',
  integrated: '生成一组接入组件…',
  protocol: '发送消息演示协议能力…',
}

export function ChatInput({
  onSend,
  disabled,
  mode,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  mode: DemoMode | 'protocol'
}) {
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim()) return
    onSend(value)
    setValue('')
  }

  return (
    <div className="chat-input">
      <LeoTextField value={value} placeholder={PLACEHOLDER[mode]} onChange={setValue} />
      <LeoButton variant="primary" disabled={disabled || !value.trim()} onClick={submit}>
        发送
      </LeoButton>
    </div>
  )
}
