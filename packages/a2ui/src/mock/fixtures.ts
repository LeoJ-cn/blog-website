import type { A2uiMessage } from '../a2ui/protocol'
import { CATALOG_ID } from '../a2ui/catalog-meta'

const SURFACE_ID = 'main'

export const mockMessages: A2uiMessage[] = [
  { version: 'v0.9', createSurface: { surfaceId: SURFACE_ID, catalogId: CATALOG_ID } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [
        { id: 'root', component: 'Column', children: ['title', 'stats', 'orders'] },
        { id: 'title', component: 'Text', text: '生产绩效', variant: 'h1' },
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

// 增量更新：只改标题，验证「不重建整棵树」
export const incrementalMessages: A2uiMessage[] = [
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [{ id: 'title', component: 'Text', text: '今天的生产绩效', variant: 'h1' }],
    },
  },
]
