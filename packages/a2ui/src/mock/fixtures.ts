import type { A2uiMessage } from '../a2ui/protocol'
import { CATALOG_ID } from '../a2ui/catalog-meta'

const SURFACE_ID = 'complex-demo'

/**
 * 第一轮：只给默认数据。
 *
 * 建 surface、上传组件树，然后灌一份初始数据，让页面先渲染出完整界面。
 */
const defaultBatch: A2uiMessage[] = [
  {
    version: 'v0.9',
    createSurface: {
      surfaceId: SURFACE_ID,
      catalogId: CATALOG_ID,
      // 打开后，用户交互触发的 action 会带上这一个 surface 的完整数据模型，
      // 后端无需再问前端要，直接拿到点击那一刻的当前值。
      sendDataModel: true,
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [
        { id: 'root', component: 'Column', children: ['title', 'tip', 'stats', 'form', 'actions'] },
        { id: 'title', component: 'LeoText', text: '复杂组件展示', variant: 'h2' },
        {
          id: 'tip',
          component: 'LeoText',
          text: '这些组件由 JSON 经适配层渲染，与「基础组件展示」页直接写 JSX 的组件应完全一致。',
          variant: 'caption',
        },
        {
          id: 'stats',
          component: 'Chart',
          kind: 'bar',
          height: 260,
          data: { path: '/outputByArea' },
          xField: 'area',
          series: [
            { field: 'actual', label: '实际' },
            { field: 'planned', label: '计划', color: '#c5cfe0' },
          ],
          showValueLabel: true,
        },
        { id: 'form', component: 'LeoCard', child: 'formInner' },
        { id: 'formInner', component: 'Column', children: ['nameField', 'rememberBox'] },
        {
          id: 'nameField',
          component: 'LeoTextField',
          label: '产线名称',
          value: { path: '/form/line' },
        },
        {
          id: 'rememberBox',
          component: 'LeoCheckBox',
          label: '记住这台设备',
          value: { path: '/form/remember' },
        },
        {
          id: 'actions',
          component: 'Row',
          children: ['orders'],
          justify: 'start',
        },
        {
          id: 'orders',
          component: 'OrderCard',
          orderNo: { path: '/order/no' },
          amount: { path: '/order/amount' },
          onView: { event: { name: 'view-order' } },
        },
      ],
    },
  },
  {
    version: 'v0.9',
    updateDataModel: {
      surfaceId: SURFACE_ID,
      path: '/',
      value: {
        order: { no: 'SVPC-PRO-2410', amount: 128.5 },
        form: { line: 'A 区装配线', remember: true },
        outputByArea: [
          { area: 'A 区', actual: 6420, planned: 6845 },
          { area: 'B 区', actual: 5880, planned: 6189 },
          { area: 'C 区', actual: 4260, planned: 4532 },
          { area: '精加工', actual: 1900, planned: 2114 },
        ],
      },
    },
  },
]

/**
 * 第二轮：只给更新数据。
 *
 * 不重建组件树，只发 updateDataModel 与一条 updateComponents：
 * 前者验证数据绑定会推动已挂载的组件刷新（图表要重绘），
 * 后者验证单个组件可以被原地替换而其余节点不动。
 */
const updateBatch: A2uiMessage[] = [
  {
    version: 'v0.9',
    updateDataModel: {
      surfaceId: SURFACE_ID,
      path: '/',
      value: {
        order: { no: 'SVPC-PRO-2411', amount: 268.0 },
        form: { line: 'B 区装配线', remember: false },
        outputByArea: [
          { area: 'A 区', actual: 7100, planned: 6900 },
          { area: 'B 区', actual: 6420, planned: 6280 },
          { area: 'C 区', actual: 5300, planned: 5010 },
          { area: '精加工', actual: 2860, planned: 2450 },
        ],
      },
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [
        { id: 'title', component: 'LeoText', text: '复杂组件展示（数据已更新）', variant: 'h2' },
        {
          id: 'tip',
          component: 'LeoText',
          text: '第一轮下发默认数据，停顿后第二轮只发更新数据；组件树未重建。',
          variant: 'caption',
        },
      ],
    },
  },
]

/**
 * 第三轮：清空。
 *
 * 只发 deleteSurface，surface 连同它的组件树与数据模型一起消失，
 * 页面回到「等待生成…」；下一条 createSurface 会重新建一棵，而不是复用旧树。
 */
const clearMessages: A2uiMessage[] = [
  { version: 'v0.9', deleteSurface: { surfaceId: SURFACE_ID } },
]

/**
 * 按请求次数取消息，三次一循环：默认 → 增量 → 清空 → 默认 → …
 *
 * @param requestIndex 这是本页第几次发送，从 0 开始。
 */
export function messagesForRequest(requestIndex: number): A2uiMessage[] {
  const phase = requestIndex % 3
  if (phase === 0) return defaultBatch
  if (phase === 1) return updateBatch
  return clearMessages
}

export const COMPLEX_SURFACE_ID = SURFACE_ID
