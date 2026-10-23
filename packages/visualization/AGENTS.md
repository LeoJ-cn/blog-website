# visualization Package 开发约束

- 继承仓库根目录 `AGENTS.md` 和 `packages/AGENTS.md` 的全部约束。
- 本 Package 统一承载 ECharts 图表封装、大屏布局、可视化主题和数据适配能力。
- 公共能力必须从 `src/index.ts` 导出，调用方不得依赖内部实现路径。
- 图表运行时与大屏布局保持分层，避免页面布局逻辑侵入通用图表封装。
- 新增布局只能使用 Flexbox、媒体查询或合理的绝对定位，禁止使用 CSS Grid。
