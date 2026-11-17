import { useState } from 'react'
import { Button, Card, CheckBox, Text, TextField } from '@white55/a2ui-ui'

/**
 * 基础组件页：直接使用 @white55/a2ui-ui 的组件，不经过 A2UI。
 *
 * 与「复杂组件展示」页对照，验证同一个组件库在两条使用路径下
 * 渲染出的样式与交互是否完全一致 —— 左侧固定区域用的也是这一批组件。
 */
export function BasicDemo() {
  const [line, setLine] = useState('A 区装配线')
  const [remember, setRemember] = useState(true)
  const [lastAction, setLastAction] = useState<string | null>(null)

  return (
    <div className="demo-stack">
      <Text variant="h2">基础组件展示</Text>
      <Text variant="caption">
        这些组件直接来自 @white55/a2ui-ui，没有经 JSON 与适配层；
        与「复杂组件展示」页里的同名组件应完全一致。
      </Text>

      <Card>
        <Text variant="h4">表单控件</Text>
        <TextField label="产线名称" value={line} onChange={setLine} />
        <CheckBox label="记住这台设备" checked={remember} onChange={setRemember} />
      </Card>

      <Card>
        <Text variant="h4">按钮变体</Text>
        <div className="demo-row">
          <Button variant="primary" onClick={() => setLastAction('primary')}>
            主按钮
          </Button>
          <Button variant="default" onClick={() => setLastAction('default')}>
            次按钮
          </Button>
          <Button variant="borderless" onClick={() => setLastAction('borderless')}>
            无边框
          </Button>
          <Button variant="primary" disabled>
            禁用态
          </Button>
        </div>
        <Text variant="caption">
          {lastAction ? `最近点击：${lastAction}` : '点击任一按钮查看回传'}
        </Text>
      </Card>

      <Card borderColor="warning">
        <Text variant="h5">警告色卡片</Text>
        <Text variant="body">Card 的 borderColor 支持 default / warning / danger 三档。</Text>
      </Card>
    </div>
  )
}
