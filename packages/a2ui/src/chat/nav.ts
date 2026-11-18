/**
 * 侧边栏导航的数据结构。
 *
 * 一级项可以有 children；有 children 的项只作为分组标题，点击负责展开/收起，
 * 真正的「当前页」永远是叶子节点。这样二级导航不会出现「父项被选中」的歧义。
 */
export interface NavItem {
  key: string
  label: string
  /**
   * 收起状态下的图标字形。
   *
   * 侧边栏收起时只显示这一个字符，文字通过 tooltip 悬浮显示；
   * 用字形而不是图片，是为了不引入额外资源、也不用处理 @2x 之类的问题。
   */
  icon: string
  /** 路由路径；没有 path 的项只是分组标题，不参与导航 */
  path?: string
  children?: NavItem[]
}

export interface NavGroup {
  key: string
  title: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'components',
    title: '组件展示',
    items: [
      {
        key: 'component-demos',
        label: '三种使用形态',
        icon: '▦',
        children: [
          { key: 'library', label: 'UI 组件库', icon: '◻', path: '/library' },
          { key: 'builtin', label: 'A2UI 自带组件', icon: '◈', path: '/builtin' },
          { key: 'integrated', label: 'A2UI  自定义组件', icon: '◉', path: '/integrated' },
        ],
      },
    ],
  },
  {
    key: 'protocol',
    title: '协议能力',
    items: [
      { key: 'sse', label: '增量数据与清空', icon: '⇄', path: '/protocol/sse' },
      { key: 'action', label: '组件动作回传', icon: '⟳', path: '/protocol/action' },
    ],
  },
]

/** 路径 → 内容区标题，二级 header 用它做面包屑。 */
export const PATH_LABEL: Record<string, string> = {
  '/library': 'UI 组件库',
  '/builtin': 'A2UI 自带组件',
  '/integrated': 'A2UI  自定义组件',
  '/protocol/sse': '增量数据与清空',
  '/protocol/action': '组件动作回传',
}

/** 内容区内部的 Tab，直接对应三个演示路由。 */
export const CONTENT_TABS = [
  { path: '/library', label: 'UI 组件库' },
  { path: '/builtin', label: 'A2UI 自带组件' },
  { path: '/integrated', label: 'A2UI  自定义组件' },
]
