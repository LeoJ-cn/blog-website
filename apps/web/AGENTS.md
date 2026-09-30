# apps/web 开发约束

- 继承仓库根目录 `AGENTS.md` 的全部约束。
- 本文件只补充 `apps/web/**` 的应用规则和专题文档路由。
- 使用 Vue 3、TypeScript、`<script setup lang="ts">` 和 Composition API。
- 按 `app`、`pages`、`widgets`、`features`、`shared`、`assets` 组织源码。
- 技术 Demo 按 Feature 组织；第一阶段只保留入口和占位页面，不实现具体 Demo。
- Vite 与 Webpack 5 必须共享 `apps/web/src`，禁止复制业务源码。
- 默认只运行 Vite 的开发、构建和验证命令。Webpack 默认关闭；只有用户在当前请求中明确要求时，才允许执行 Webpack 开发、构建、分析或相关基准命令。
- 路由优先采用懒加载；全局状态只放跨页面、跨 Feature 且需要长期生命周期的数据。
- Element Plus 后续必须按需引入，不允许无条件全量注册。

## 专题文档路由

- 涉及 `apps/web/src/app/services/**`、运行时配置、HTTP、WebSocket 或服务装配时，读取 `docs/specifications/runtime-services.md`。
- 涉及低代码 Playground 与 `@blog/low-code` 的页面集成、编辑器打开/关闭、保存结果展示或演示数据时，读取 `docs/references/logic-editor-original-implementation.md`；只有任务同时修改 `packages/low-code/**` 时，才继续按 `packages/low-code/AGENTS.md` 读取迁移或类型治理文档。
- 仅在继续执行、评审或核对当前逻辑编辑器稳定性修复，并且任务涉及低代码 Playground 宿主页时，读取 `docs/superpowers/plans/2026-09-30-low-code-logic-editor-stability-remediation.md`；普通 Web 或 Playground 修改不得默认读取该计划。计划完成后删除本条临时路由。
- 涉及通用性能面板、性能面板组合式函数或其页面接入时，读取 `docs/superpowers/specs/2026-09-27-reusable-performance-panel-design.md`。
- 涉及帧指标语义、刷新率、掉帧、LoAF 或 `@blog/monitoring` 接入时，读取 `docs/superpowers/specs/2026-09-27-frame-monitor-v2-design.md`；同时修改 `packages/monitoring/**` 时继续读取 `packages/monitoring/AGENTS.md`。
- 实施既有计划时只读取与当前任务直接对应的 plan；不得因为修改 `apps/web/**` 而通读 `docs/superpowers/plans/`。
