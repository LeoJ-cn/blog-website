# ui-playground Package 规则

- 继承仓库根目录 `AGENTS.md` 和 `packages/AGENTS.md`。
- 本包在原目录独立开发和构建 UI Storybook；只通过 `@white55/ui` 公共入口使用组件，不反向依赖 Web 或文档包，也不向 Web 导出运行时页面。
