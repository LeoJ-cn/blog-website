# Engineering Foundation

本文件由《项目开发prompt.md》整理而来，是 `blog-web` 第一阶段工程骨架的基准说明。

## 当前实施范围

第一阶段只建立：

- pnpm Workspace 与 Monorepo 目录边界；
- Node.js、pnpm 和依赖版本锁定规则；
- 分层 `AGENTS.md` 约束；
- 预留的 docs、scripts、infra 和 CI 目录；
- 后续 Vite、Webpack、Packages、测试和部署阶段的入口。

Vue 页面、双构建配置、共享 Packages、CI、Docker 和 Playwright 将在后续阶段逐步实现并单独确认。

## 关键决策

- 前端仓库独立于未来的后端仓库。
- 默认部署目标为 GitHub Pages SPA。
- 默认构建工具为 Vite，Webpack 5 为正式的第二套构建链路。
- 当前不实现 SSR、SEO、i18n、RBAC、Vitest 和 Vue Test Utils。
- 所有依赖安装由用户执行，Agent 不自动安装。
