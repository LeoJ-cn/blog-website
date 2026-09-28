# @blog/low-code

`@blog/low-code` 用于承载本仓库的全部低代码能力。当前阶段首先等价迁移旧逻辑编辑器，包括图交互、节点配置、图数据保存恢复，以及 `SimpleProcessData[]/blockData` 生成逻辑。

## 边界

- 逻辑编辑器内部算法、节点协议、锚点协议、注册关系和生成结果不得因迁移而改变。
- Vue 2 class-style TSX 转换为 Vue 3 `defineComponent` + Options API + TSX，继续保留 TSX render 结构。
- 旧项目的 Store、mixin、controller 和 dispatcher 通过包内 compatibility 接口承接。
- 外部消费者只能通过 `src/index.ts` 使用本包，不得直接引用内部节点、behavior 或翻译器。
- 页面中的交互、调试和验收由使用方手动执行，Agent 不自动操作浏览器。

完整迁移约束见：

- `docs/superpowers/specs/2026-09-28-low-code-logic-editor-migration-design.md`
- `docs/superpowers/plans/2026-09-28-low-code-logic-editor-migration.md`

## 公共 API

包根入口只暴露以下能力：

- `LogicEditor`：Vue 3 TSX 逻辑编辑器组件。
- `LogicEditorService`：将 `GraphData` 转为旧协议 `SimpleProcessData[]/blockData` 的原生成链路。
- `createLowCodeContext`：绑定宿主能力适配器。
- `Method`、`Data`、`Schema`、`SimpleProcessData`、`GraphData` 及相关持久化枚举。

节点实现、behavior、单个翻译器和 G6 注册细节不是公共 API。

## 使用方式

```ts
import { LogicEditor, createLowCodeContext } from '@blog/low-code'

const context = createLowCodeContext({
  methods,
  data,
  store,
  dispatcher,
  controller,
  getLocale: () => 'zh-CN',
  translate: (key) => key,
  feedback,
})
```

`context` 必须提供：键值存储、同步事件分发、方法和变量数组、分类/节点/API 查询、locale、文案翻译及成功/失败/确认反馈。组件使用 `v-model` 读写当前 `GraphData`，并在保存时触发 `save`。方法的 `graphData` 与 `blockData` 仍写回传入的 `methods` 数组。

本包完整保留旧编辑器的节点类型、锚点协议、连接规则、配置构建器和翻译器注册关系。首期重点验收“开始、结束、变量、赋值、判断、计算”只表示最小闭环，不表示裁剪其他节点。

## 手动页面验收

页面交互必须由使用方手动完成：

1. 运行 `pnpm dev:vite`，访问 `#/playground/low-code`。
2. 编辑器抽屉打开后，确认方法列表、变量页签及所有内置节点分类可见。
3. 双击“演示方法”进入详情，依次拖入变量、计算、判断和赋值节点，并连接“开始 → 计算/判断/赋值 → 结束”。
4. 修改变量值和可配置节点字段，点击确定；预期节点展示和连线不丢失。
5. 点击保存；预期页面显示 `GraphData`、`SimpleProcessData[]` 和 `blockData`，方法对象同步获得 `graphData` 与 `blockData`。
6. 复制保存结果后刷新页面，用相同 graph document 恢复；预期节点 ID、锚点索引、连线方向和生成结构保持一致。
7. 抽查重点范围外的节点仍可见、可拖入，并能随 `GraphData` 序列化和恢复。
