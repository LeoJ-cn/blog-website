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
      // 这里按功能分块列出 catalog 里的全部 9 个 Leo 组件，
      // 任何一个漏掉都会让「自定义组件」页看起来少东西，因此每块都显式标题。
      components: [
        {
          id: 'root',
          component: 'Column',
          children: [
            'title',
            'tip',
            'divider0',
            'chartBlock',
            'statBlock',
            'formBlock',
            'interactionBlock',
            'badgeBlock',
            'businessBlock',
            'searchBlock',
            'navBlock',
          ],
        },
        { id: 'title', component: 'LeoText', text: '自定义组件总览', variant: 'h1' },
        {
          id: 'tip',
          component: 'LeoText',
          text: '以下 12 个 Leo 组件均由 JSON 经适配层渲染，与「UI 组件库」页直接写 JSX 的组件应完全一致。',
          variant: 'caption',
        },
        { id: 'divider0', component: 'Divider', axis: 'horizontal' },

        // ---- 图表：每个图形一个独立组件 ----
        { id: 'chartBlock', component: 'LeoCard', child: 'chartInner' },
        { id: 'chartInner', component: 'Column', children: ['chartLabel', 'stats', 'pieRow'] },
        { id: 'chartLabel', component: 'LeoText', text: '图表（引擎模式）', variant: 'h5' },
        {
          id: 'stats',
          component: 'LeoBarChart',
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
          id: 'pieRow',
          component: 'Row',
          children: ['pie', 'gauge'],
          justify: 'start',
        },
        {
          id: 'pie',
          component: 'LeoRingChart',
          height: 220,
          data: { path: '/outputByArea' },
          nameField: 'area',
          valueField: 'actual',
        },
        {
          id: 'gauge',
          component: 'LeoGaugeChart',
          height: 220,
          value: { path: '/oee' },
          max: 100,
          unit: '%',
        },

        // ---- 指标卡：LeoStatCard ----
        { id: 'statBlock', component: 'LeoCard', child: 'statInner' },
        { id: 'statInner', component: 'Column', children: ['statLabel', 'statRow'] },
        { id: 'statLabel', component: 'LeoText', text: 'LeoStatCard', variant: 'h5' },
        {
          id: 'statRow',
          component: 'Row',
          children: ['stat1', 'stat2', 'stat3', 'stat4'],
          justify: 'start',
        },
        {
          id: 'stat1',
          component: 'LeoStatCard',
          label: '08:00 前产出',
          value: '18,460',
          caption: '计划 19,680',
        },
        {
          id: 'stat2',
          component: 'LeoStatCard',
          label: '上一个完整小时',
          value: '6,560',
          caption: '计划 6,560',
        },
        {
          id: 'stat3',
          component: 'LeoStatCard',
          label: '机加工 OEE',
          value: '80.6%',
          caption: '目标 85%',
          highlight: true,
        },
        {
          id: 'stat4',
          component: 'LeoStatCard',
          label: '一次合格率',
          value: '98.4%',
          caption: '目标 99%',
        },

        // ---- 表单：LeoTextField / LeoCheckBox ----
        { id: 'formBlock', component: 'LeoCard', child: 'formInner' },
        {
          id: 'formInner',
          component: 'Column',
          children: ['formLabel', 'nameField', 'rememberBox'],
        },
        {
          id: 'formLabel',
          component: 'LeoText',
          text: 'LeoTextField / LeoCheckBox',
          variant: 'h5',
        },
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

        // ---- 交互：LeoButton / LeoTabs ----
        { id: 'interactionBlock', component: 'LeoCard', child: 'interactionInner' },
        {
          id: 'interactionInner',
          component: 'Column',
          children: ['interactionLabel', 'btnRow', 'tabsDemo'],
        },
        {
          id: 'interactionLabel',
          component: 'LeoText',
          text: 'LeoButton / LeoTabs',
          variant: 'h5',
        },
        {
          id: 'btnRow',
          component: 'Row',
          children: ['btnPrimary', 'btnOutline', 'btnBorderless'],
          justify: 'start',
        },
        {
          id: 'btnPrimary',
          component: 'LeoButton',
          variant: 'primary',
          child: 'btnPrimaryText',
          action: { event: { name: 'primary-click' } },
        },
        { id: 'btnPrimaryText', component: 'LeoText', text: '主按钮', variant: 'body' },
        {
          id: 'btnOutline',
          component: 'LeoButton',
          variant: 'outline',
          child: 'btnOutlineText',
          action: { event: { name: 'outline-click' } },
        },
        { id: 'btnOutlineText', component: 'LeoText', text: '描边', variant: 'body' },
        {
          id: 'btnBorderless',
          component: 'LeoButton',
          variant: 'borderless',
          child: 'btnBorderlessText',
          action: { event: { name: 'borderless-click' } },
        },
        { id: 'btnBorderlessText', component: 'LeoText', text: '无边框', variant: 'body' },
        {
          id: 'tabsDemo',
          component: 'LeoTabs',
          variant: 'line',
          tabs: [
            { title: '概览', child: 'tabOverview' },
            { title: '明细', child: 'tabDetail' },
          ],
        },
        {
          id: 'tabOverview',
          component: 'LeoText',
          text: '概览面板：键盘左右方向键可在标签间切换。',
          variant: 'body',
        },
        {
          id: 'tabDetail',
          component: 'LeoText',
          text: '明细面板：内容由 buildChild 按组件 id 现场解析。',
          variant: 'body',
        },

        // ---- 徽标与链接：LeoBadge / LeoLinkButton ----
        { id: 'badgeBlock', component: 'LeoCard', child: 'badgeInner' },
        {
          id: 'badgeInner',
          component: 'Column',
          children: ['badgeLabel', 'badgeRow', 'linkRow'],
        },
        { id: 'badgeLabel', component: 'LeoText', text: 'LeoBadge / LeoLinkButton', variant: 'h5' },
        {
          id: 'badgeRow',
          component: 'Row',
          children: ['badgeDanger', 'badgeWarning', 'badgeSuccess', 'badgeBrand', 'badgeDashed'],
          justify: 'start',
        },
        { id: 'badgeDanger', component: 'LeoBadge', text: '有风险', tone: 'danger' },
        { id: 'badgeWarning', component: 'LeoBadge', text: '待审核', tone: 'warning' },
        { id: 'badgeSuccess', component: 'LeoBadge', text: '已完成', tone: 'success' },
        { id: 'badgeBrand', component: 'LeoBadge', text: '共享', tone: 'brand' },
        { id: 'badgeDashed', component: 'LeoBadge', text: '演示', tone: 'brand', dashed: true },
        {
          id: 'linkRow',
          component: 'Row',
          children: ['linkView', 'linkOpen'],
          justify: 'start',
        },
        {
          id: 'linkView',
          component: 'LeoLinkButton',
          text: '查看数据',
          action: { event: { name: 'link-view' } },
        },
        {
          id: 'linkOpen',
          component: 'LeoLinkButton',
          text: '打开工作',
          arrow: true,
          action: { event: { name: 'link-open' } },
        },

        // ---- 业务组件：LeoOrderCard / LeoModal ----
        {
          id: 'businessBlock',
          component: 'Row',
          children: ['orders', 'detailModal'],
          justify: 'start',
        },
        {
          id: 'orders',
          component: 'LeoOrderCard',
          orderNo: { path: '/order/no' },
          amount: { path: '/order/amount' },
          onView: { event: { name: 'view-order' } },
        },
        {
          id: 'detailModal',
          component: 'LeoModal',
          label: '打开详情',
          title: '订单详情',
          content: 'modalBody',
        },
        { id: 'modalBody', component: 'Column', children: ['modalText', 'modalField'] },
        {
          id: 'modalText',
          component: 'LeoText',
          text: '弹窗内容同样由组件树渲染，适配层内部维护开合状态。',
          variant: 'body',
        },
        {
          id: 'modalField',
          component: 'LeoTextField',
          label: '备注',
          value: { path: '/form/note' },
        },

        // ---- 搜索：演示 action.context 的路径绑定 ----
        // 这里刻意把本页所有可写状态都绑进 context：
        //   form/line      —— 输入框当前值
        //   form/remember  —— 勾选框当前值
        //   form/note      —— 弹窗里的备注
        // 用户改动这些控件后点搜索，后端在 /api/action 的 context 里拿到的就是
        // 点击那一刻的实际值，而不是组件初始化时下发的默认值。
        // 纯展示组件（Chart / StatCard / Badge / Card / Text）没有可写状态，
        // 不进入 context；它们绑定的数据由 processor 自动附加的 dataModel 覆盖。
        { id: 'searchBlock', component: 'LeoCard', child: 'searchInner' },
        {
          id: 'searchInner',
          component: 'Column',
          children: ['searchLabel', 'searchTip', 'searchButton'],
        },
        { id: 'searchLabel', component: 'LeoText', text: '搜索（action 取值演示）', variant: 'h5' },
        {
          id: 'searchTip',
          component: 'LeoText',
          text: '修改上方输入框或勾选框后点搜索，回传的 context 是当前页面状态。',
          variant: 'caption',
        },
        {
          id: 'searchButton',
          component: 'LeoButton',
          variant: 'primary',
          child: 'searchButtonText',
          action: {
            event: {
              name: 'search',
              context: {
                line: { path: '/form/line' },
                remember: { path: '/form/remember' },
                note: { path: '/form/note' },
              },
            },
          },
        },
        { id: 'searchButtonText', component: 'LeoText', text: '搜索', variant: 'body' },

        // ---- 路由跳转：action 名为 navigate 时由前端本地处理，不上行后端 ----
        // context.to 是目标路径；这里用字面量而非路径绑定，
        // 因为跳转目标由后端决定，不来自页面状态。
        { id: 'navBlock', component: 'LeoCard', child: 'navInner' },
        { id: 'navInner', component: 'Column', children: ['navLabel', 'navTip', 'navRow'] },
        // { id: 'navLabel', component: 'LeoText', text: '路由跳转', variant: 'h5' },
        // {
        //   id: 'navTip',
        //   component: 'LeoText',
        //   text: '点击后由前端本地跳转，不会 POST /api/action。',
        //   variant: 'caption',
        // },
        // {
        //   id: 'navRow',
        //   component: 'Row',
        //   children: ['navToBuiltin', 'navToLibrary'],
        //   justify: 'start',
        // },
        // {
        //   id: 'navToBuiltin',
        //   component: 'LeoLinkButton',
        //   text: '去 A2UI 自带组件',
        //   arrow: true,
        //   action: { event: { name: 'navigate', context: { to: '/builtin' } } },
        // },
        // {
        //   id: 'navToLibrary',
        //   component: 'LeoLinkButton',
        //   text: '去 UI 组件库',
        //   arrow: true,
        //   action: { event: { name: 'navigate', context: { to: '/library' } } },
        // },
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
        // note 对应 LeoModal 内的备注输入框；缺失会让该绑定渲染成空值
        form: { line: 'A 区装配线', remember: true, note: '' },
        // oee 供 LeoGaugeChart 绑定；仪表盘只吃单个标量，不是数组
        oee: 80.6,
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
        form: { line: 'B 区装配线', remember: false, note: '' },
        oee: 92.4,
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
        { id: 'title', component: 'LeoText', text: 'Leo 复杂组件展示（数据已更新）', variant: 'h5' },
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
