# a2ui-catalog Package 规则

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md`。
- 本包只存放 A2UI 组件契约（Zod schema）。只有 schema，没有实现。
- 禁止依赖 React、任何 UI 库、任何图表库。`dependencies` 只允许 `@a2ui/web_core` 与 `zod`。
- 新增组件时同时更新 `src/index.ts` 的导出。
- 产出的 `dist/catalog.json` 是构建产物，不进版本控制。
