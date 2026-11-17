import type { A2uiMessage } from '../a2ui/protocol'
import { CATALOG_ID } from '../a2ui/catalog-meta'

const SURFACE_ID = 'complex-demo'

/**
 * 复杂组件展示页的数据：全部经 A2UI 渲染。
 * 覆盖自研组件（Chart / OrderCard）与 basic catalog 的布局、表单、按钮。
 */
const complexMessages: A2uiMessage[] = [
  { version: 'v0.9', createSurface: { surfaceId: SURFACE_ID, catalogId: CATALOG_ID } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [
        { id: 'root', component: 'Column', children: ['title', 'tip', 'stats', 'form', 'actions'] },
        { id: 'title', component: 'Text', text: '复杂组件展示', variant: 'h2' },
        {
          id: 'tip',
          component: 'Text',
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
        { id: 'form', component: 'Card', child: 'formInner' },
        { id: 'formInner', component: 'Column', children: ['nameField', 'rememberBox'] },
        {
          id: 'nameField',
          component: 'TextField',
          label: '产线名称',
          value: { path: '/form/line' },
        },
        {
          id: 'rememberBox',
          component: 'CheckBox',
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
  // 增量更新：只改标题，验证「不重建整棵树」
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [
        { id: 'title', component: 'Text', text: '复杂组件展示（已增量更新）', variant: 'h2' },
      ],
    },
  },
]

export function messagesFor(): A2uiMessage[] {
  return complexMessages
}

export const COMPLEX_SURFACE_ID = SURFACE_ID
