import { TabsApi, createComponentImplementation } from '../protocol'
import { LeoTabs, LeoText } from '@white55/a2ui-ui'

/**
 * Tabs 适配器：把 A2UI 的 `tabs: { title, child }[]` 翻成 LeoTabs 的 items。
 *
 * A2UI 的 child 是组件 id，面板内容要靠 buildChild 现场解析成 React 节点；
 * 标题是 DynamicString，可能是字面量也可能是数据绑定，这里只处理字符串情形，
 * 绑定值由 web_core 在解析 props 时就已经解好，走到这里应该已是字符串。
 */
export const A2uiTabs = createComponentImplementation(TabsApi, ({ props, buildChild }) => (
  <LeoTabs
    items={props.tabs.map((tab, index) => ({
      value: String(index),
      title: typeof tab.title === 'string' ? tab.title : String(tab.title ?? ''),
      content: buildChild(tab.child) ?? (
        <LeoText variant="body">标签内容缺失</LeoText>
      ),
    }))}
  />
))
