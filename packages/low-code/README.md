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
