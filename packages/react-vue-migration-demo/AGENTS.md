# React → Vue 迁移 Demo Package 约束

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md`。
- 公共入口只导出适合 Vue 宿主使用的 `ReactVueMigrationDemo`，不得暴露 React Shell、Bridge、bootstrap 或 Migration Platform。
- Package 禁止依赖 `apps/web`；`apps/web` 只能通过公共入口消费本 Package。
- React Shell 使用 `MemoryRouter`，不得接管宿主页面 History。
- `$route.params` 转为 Props，组件 `$emit` 转为 Events Contract，只有 `$router` 进入 Migration Platform。
- API、utils 与 mitt EventBus 保持框架无关，不得放入 Migration Platform。
- React、React DOM、React Router、mitt 及本 Package 的开发依赖只声明在本目录的 `package.json`。
- 继续实现、评审或核对本迁移 Demo 时读取：
  - `docs/superpowers/specs/2026-09-30-react-vue-migration-demo-design.md`
  - `docs/superpowers/plans/2026-09-30-react-vue-migration-demo.md`
