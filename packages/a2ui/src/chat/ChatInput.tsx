import { useState } from 'react'
import { Button, TextField } from '@white55/a2ui-ui'

const PLACEHOLDER: Record<'basic' | 'complex', string> = {
  basic: '基础页直接写组件，发送消息只用于回显…',
  complex: '生成一个订单卡片与图表…',
}

export function ChatInput({
  onSend,
  disabled,
  mode,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  mode: 'basic' | 'complex'
}) {
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim()) return
    onSend(value)
    setValue('')
  }

  return (
    <div className="chat-input">
      <TextField value={value} placeholder={PLACEHOLDER[mode]} onChange={setValue} />
      <Button variant="primary" disabled={disabled || !value.trim()} onClick={submit}>
        发送
      </Button>
    </div>
  )
}
