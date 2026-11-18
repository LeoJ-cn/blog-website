# a2ui 应用 Package 规则

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md`。
- 本包是 `/a2ui` 子路径的 React 应用，独立构建到 `dist-vite/a2ui`。
- `src/a2ui/protocol.ts` 是 `@a2ui/react` 与 `@a2ui/web_core` 的唯一入口，其余文件禁止直接 import `@a2ui/*`。
- 目录分工：`src/chat/**` 管网络与界面状态，`src/a2ui/adapters/**` 管协议字段翻译，两者不互相引用。
- `src/a2ui/adapters/**` 是适配层：禁止 import `echarts`、`@radix-ui/*`。
- `src/chat/**` 可直接用 `@white55/a2ui-ui`；右侧 A2UI 渲染区只能经 `src/a2ui/adapters/**`。
- 禁止 CSS Grid，布局使用 Flexbox。
- 禁止 import `@white55/web`（主站应用）。
- A2UI 相关文档统一放在本包 `docs/`，不写入仓库根 `docs/`：`a2ui-libraries-api.md`（各库 API 手册）、`a2ui-frontend-usage.md`（使用教程）、`radix-a2ui-integration-matrix.md`（Radix 接入能力清单）、以及设计与实施计划。修改 A2UI 代码前按需读取对应文档。
