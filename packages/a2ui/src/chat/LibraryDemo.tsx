import { useState } from 'react'
import {
  LeoBadge,
  LeoButton,
  LeoCard,
  LeoCheckBox,
  LeoChart,
  LeoLinkButton,
  LeoModal,
  LeoStatCard,
  LeoTabs,
  LeoTable,
  LeoText,
  LeoTextField,
} from '@white55/a2ui-ui'

/**
 * 表格演示数据。
 *
 * 放在组件外：LeoTable 用引用相等判断是否要 replaceData，
 * 若在渲染中内联数组，每次渲染都会触发一次无意义的数据替换。
 */
const INITIAL_TABLE_ROWS: Record<string, unknown>[] = [
  { orderNo: 'SO-2026001', customer: '华东机械', amount: 128600.5, rate: 0.86, dueDate: '2026-12-01', status: '进行中' },
  { orderNo: 'SO-2026002', customer: '南方电子', amount: 43200, rate: 1, dueDate: '2026-11-25', status: '已完成' },
  { orderNo: 'SO-2026003', customer: '北方重工', amount: 98750.75, rate: 0.42, dueDate: '2026-12-15', status: '延期' },
  { orderNo: 'SO-2026004', customer: '西部材料', amount: 15600, rate: 0.95, dueDate: '2026-11-30', status: '进行中' },
  { orderNo: 'SO-2026005', customer: '中原物流', amount: 234890.25, rate: 0.68, dueDate: '2026-12-20', status: '进行中' },
]

/**
 * Tab ①：UI 组件库。
 *
 * 直接 import @white55/a2ui-ui 的组件写 JSX，完全不涉及 A2UI。
 * 这些组件不认识协议，只接受普通 React props。
 */
export function LibraryDemo() {
  const [line, setLine] = useState('A 区装配线')
  const [remember, setRemember] = useState(true)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [note, setNote] = useState('')
  const [tableRows, setTableRows] = useState(INITIAL_TABLE_ROWS)

  // 换一份数据，用于验证 replaceData 是否保留用户当前排序与滚动位置
  const shuffleTable = () => {
    setTableRows((prev) =>
      prev.length === 0
        ? INITIAL_TABLE_ROWS
        : [...INITIAL_TABLE_ROWS].sort(() => Math.random() - 0.5).slice(0, prev.length),
    )
  }

  return (
    <div className="demo-stack">
      <LeoText variant="h2">UI 组件库</LeoText>
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
          <LeoButton variant="dark" onClick={() => setLastAction('dark')}>
            添加任务
          </LeoButton>
          <LeoButton variant="primary" onClick={() => setLastAction('primary')}>
            主按钮
          </LeoButton>
          <LeoButton variant="default" onClick={() => setLastAction('default')}>
            次按钮
          </LeoButton>
          <LeoButton variant="outline" onClick={() => setLastAction('outline')}>
            描边
          </LeoButton>
          <LeoButton variant="borderless" onClick={() => setLastAction('borderless')}>
            无边框
          </LeoButton>
          <LeoButton variant="primary" disabled>
            禁用态
          </LeoButton>
        </div>
        <div className="demo-row">
          <LeoButton variant="dark" size="sm">
            小号
          </LeoButton>
          <LeoButton variant="default" size="sm">
            小号
          </LeoButton>
        </div>
        <LeoText variant="caption">
          {lastAction ? `最近点击：${lastAction}` : '点击任一按钮查看回传'}
        </LeoText>
      </LeoCard>

      <LeoCard>
        <LeoText variant="h4">Badge 状态标签</LeoText>
        <div className="demo-row">
          <LeoBadge tone="danger">有风险</LeoBadge>
          <LeoBadge tone="warning">待审核</LeoBadge>
          <LeoBadge tone="neutral">待处理</LeoBadge>
          <LeoBadge tone="success">已完成</LeoBadge>
          <LeoBadge tone="brand">共享</LeoBadge>
          <LeoBadge tone="outline">受限</LeoBadge>
          <LeoBadge tone="brand" dashed>
            演示
          </LeoBadge>
        </div>
      </LeoCard>

      <LeoCard>
        <div className="demo-row demo-row--between">
          <LeoText variant="h4">StatCard 指标卡</LeoText>
          <LeoLinkButton arrow>查看全部</LeoLinkButton>
        </div>
        <div className="demo-row">
          <LeoStatCard label="08:00 前产出" value="18,460" caption="计划 19,680" />
          <LeoStatCard label="上一个完整小时" value="6,560" caption="计划 6,560" />
          <LeoStatCard label="机加工 OEE" value="80.6%" caption="目标 85%" highlight />
          <LeoStatCard label="一次合格率" value="98.4%" caption="目标 99%" />
        </div>
        <div className="demo-row">
          <LeoLinkButton>查看数据</LeoLinkButton>
          <LeoLinkButton arrow>打开工作</LeoLinkButton>
        </div>
      </LeoCard>

      <LeoCard borderColor="warning">
        <LeoText variant="h5">卡片边色</LeoText>
        <LeoText variant="body">borderColor 支持 default / warning / danger。</LeoText>
      </LeoCard>

      <LeoCard>
        <LeoText variant="h4">Tabs（Radix）</LeoText>
        <LeoTabs
          items={[
            {
              title: '概览',
              content: <LeoText variant="body">第一个标签的内容，键盘左右方向键可切换。</LeoText>,
            },
            {
              title: '明细',
              content: <LeoText variant="body">第二个标签的内容。</LeoText>,
            },
            {
              title: '设置',
              content: <LeoText variant="body">第三个标签的内容。</LeoText>,
            },
          ]}
        />
      </LeoCard>

      <LeoCard>
        <LeoText variant="h4">Modal（Radix Dialog）</LeoText>
        <LeoText variant="body">点击按钮打开弹窗，Esc 或点击遮罩可关闭。</LeoText>
        <div className="demo-row">
          <LeoButton variant="primary" onClick={() => setModalOpen(true)}>
            打开 Modal
          </LeoButton>
        </div>
        <LeoModal open={modalOpen} onOpenChange={setModalOpen} title="示例弹窗">
          <LeoText variant="body">
            这是一个基于 Radix Dialog 的弹窗，具备焦点陷阱与 Esc 关闭。
          </LeoText>
          <LeoTextField label="备注" value={note} onChange={setNote} />
        </LeoModal>
      </LeoCard>

      <LeoCard>
        <LeoText variant="h4">Chart（引擎模式）</LeoText>
        <LeoText variant="caption">
          三种图型各有独立字段：直角坐标系用 xField + series，饼图用 nameField + valueField，仪表盘只有 value。
        </LeoText>
        <LeoChart
          kind="cartesian"
          chartType="bar"
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
        <div className="demo-row">
          <LeoChart
            kind="pie"
            chartType="ring"
            height={220}
            data={[
              { name: 'A 区', value: 6420 },
              { name: 'B 区', value: 5880 },
              { name: 'C 区', value: 4260 },
            ]}
            nameField="name"
            valueField="value"
          />
          <LeoChart kind="gauge" value={80.6} max={100} unit="%" height={220} />
        </div>
      </LeoCard>

      <LeoCard>
        <LeoText variant="h4">Table（引擎模式）</LeoText>
        <div className="demo-row">
          <LeoButton variant="default" onClick={shuffleTable}>
            替换数据（验证排序是否保留）
          </LeoButton>
        </div>
        <LeoTable
          columns={[
            { field: 'orderNo', label: '订单号', width: 140, sortable: true },
            { field: 'customer', label: '客户', sortable: true },
            { field: 'amount', label: '金额', width: 120, align: 'end', sortable: true, format: 'money' },
            { field: 'rate', label: '完成率', width: 100, align: 'end', format: 'percent' },
            { field: 'dueDate', label: '交付日期', width: 130, format: 'date' },
            { field: 'status', label: '状态', width: 90, align: 'center' },
          ]}
          rows={tableRows}
          height={260}
          stripe
          onRowClick={(row) => setLastAction(`点击了订单 ${String(row.orderNo)}`)}
        />
        {lastAction ? <LeoText variant="caption">{lastAction}</LeoText> : null}
      </LeoCard>
    </div>
  )
}
