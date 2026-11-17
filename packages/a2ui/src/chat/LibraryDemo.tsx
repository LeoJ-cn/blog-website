import { useState } from 'react'
import {
  LeoButton,
  LeoCard,
  LeoCheckBox,
  LeoChart,
  LeoText,
  LeoTextField,
} from '@white55/a2ui-ui'

/**
 * Tab ①：作为 UI 组件库单独使用。
 *
 * 直接 import @white55/a2ui-ui 的组件写 JSX，完全不涉及 A2UI。
 * 这些组件不认识协议，只接受普通 React props。
 */
export function LibraryDemo() {
  const [line, setLine] = useState('A 区装配线')
  const [remember, setRemember] = useState(true)
  const [lastAction, setLastAction] = useState<string | null>(null)

  return (
    <div className="demo-stack">
      <LeoText variant="h2">作为 UI 组件库单独使用</LeoText>
      <LeoText variant="caption">
        直接 import @white55/a2ui-ui，写普通 JSX。这些组件不知道 A2UI 存在，
        任何 React 项目都能这样用。
      </LeoText>

      <LeoCard>
        <LeoText variant="h4">Text 变体</LeoText>
        <LeoText variant="h1">h1 标题</LeoText>
        <LeoText variant="h3">h3 子标题</LeoText>
        <LeoText variant="body">body 正文，用于常规内容。</LeoText>
        <LeoText variant="caption">caption 辅助说明，字号更小、透明度更低。</LeoText>
      </LeoCard>

      <LeoCard>
        <LeoText variant="h4">表单控件</LeoText>
        <LeoTextField label="产线名称" value={line} onChange={setLine} />
        <LeoCheckBox label="记住这台设备" checked={remember} onChange={setRemember} />
        <LeoTextField label="校验失败态" value="非法值" invalid onChange={() => {}} />
        <LeoTextField label="禁用态" value="不可编辑" disabled onChange={() => {}} />
      </LeoCard>

      <LeoCard>
        <LeoText variant="h4">按钮变体</LeoText>
        <div className="demo-row">
          <LeoButton variant="primary" onClick={() => setLastAction('primary')}>
            主按钮
          </LeoButton>
          <LeoButton variant="default" onClick={() => setLastAction('default')}>
            次按钮
          </LeoButton>
          <LeoButton variant="borderless" onClick={() => setLastAction('borderless')}>
            无边框
          </LeoButton>
          <LeoButton variant="primary" disabled>
            禁用态
          </LeoButton>
        </div>
        <LeoText variant="caption">
          {lastAction ? `最近点击：${lastAction}` : '点击任一按钮查看回传'}
        </LeoText>
      </LeoCard>

      <LeoCard borderColor="warning">
        <LeoText variant="h5">卡片边色</LeoText>
        <LeoText variant="body">borderColor 支持 default / warning / danger。</LeoText>
      </LeoCard>

      <LeoCard>
        <LeoText variant="h4">Chart（引擎模式）</LeoText>
        <LeoChart
          kind="bar"
          height={220}
          data={[
            { area: 'A 区', actual: 6420, planned: 6845 },
            { area: 'B 区', actual: 5880, planned: 6189 },
            { area: 'C 区', actual: 4260, planned: 4532 },
          ]}
          xField="area"
          series={[
            { field: 'actual', label: '实际' },
            { field: 'planned', label: '计划', color: '#c5cfe0' },
          ]}
          showValueLabel
        />
      </LeoCard>
    </div>
  )
}
