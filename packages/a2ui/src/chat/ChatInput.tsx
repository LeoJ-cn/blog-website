import { useState } from 'react'
import { Button, TextField } from '@white55/a2ui-ui'

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim()) return
    onSend(value)
    setValue('')
  }

  return (
    <div className="chat-input">
      <TextField value={value} placeholder="生成一个订单卡片…" onChange={setValue} />
      <Button variant="primary" disabled={disabled || !value.trim()} onClick={submit}>
        发送
      </Button>
    </div>
  )
}
