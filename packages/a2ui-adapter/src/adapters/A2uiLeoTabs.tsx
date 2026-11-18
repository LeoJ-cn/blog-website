import { LeoTabsApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoTabs, LeoText } from '@white55/a2ui-ui'

/**
 * 把 A2UI 的 `tabs: { title, child }[]` 翻成 LeoTabs 的 items。
 *
 * child 是组件 id，面板内容要靠 buildChild 现场解析成 React 节点。
 * title 是 DynamicString，绑定值在 web_core 解析 props 时已解好，走到这里是字符串。
 */
export const A2uiLeoTabs = createComponentImplementation(LeoTabsApi, ({ props, buildChild }) => (
  <LeoTabs
    items={props.tabs.map((tab, index) => ({
      value: String(index),
      title: typeof tab.title === 'string' ? tab.title : String(tab.title ?? ''),
      content: buildChild(tab.child) ?? <LeoText variant="body">标签内容缺失</LeoText>,
    }))}
  />
))
