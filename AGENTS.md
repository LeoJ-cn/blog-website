# blog-web 工程约束

## 项目目标

本仓库是面向开发者的 Engineering Showcase / Developer Playground 前端项目，使用 Vue 3、TypeScript、pnpm Workspace 和 Monorepo 组织长期演进的技术 Demo。

## 当前阶段边界

- 当前阶段只建立工程骨架和约束，不实现具体技术 Demo。
- 不自动安装依赖、软件、CLI 或浏览器；需要安装时必须先给出命令并等待用户确认。
- 所有依赖使用精确版本，禁止使用 `^`、`~`、`*` 或 `latest`。
- 文档默认使用简体中文；技术标识符、命令、API 和路径保留英文。

## 目录边界

- `apps/`：可运行应用。
- `packages/`：可复用能力，必须有清晰公共 API 和依赖方向。
- `docs/`：规范、架构和实施计划。
- `scripts/`：可复用工程脚本，不把复杂逻辑堆进 `package.json`。
- `infra/`：Docker 等基础设施配置。

## 构建原则

Vite 与 Webpack 5 是两套正式 Build Pipeline，必须复用同一份应用源码。不得因为当前项目规模较小而删除已经规划的工程能力；暂时不启用的能力应通过预留、Feature Flag 或独立命令保留。

### 本地执行限制

- 默认开发、构建和验证只允许使用 Vite，对应 `pnpm dev:vite` 和 `pnpm build:vite`。
- 未经用户在当前请求中明确要求，禁止执行 `dev:webpack`、`build:webpack`、`analyze:webpack` 或包含 Webpack 构建的基准命令。
- Webpack 5 管线必须继续保留，但默认视为关闭状态，不能把“双构建”作为常规完成检查。

## 测试代码限制

- 除非用户在当前请求中明确要求编写测试代码，否则禁止新增、修改或生成任何测试代码。
- 用户未明确要求测试代码时，不得为了验证功能、修复回归或执行测试驱动开发而创建测试文件、测试用例、测试夹具、测试辅助代码或临时测试脚本。
- 未要求编写测试代码时，可以运行仓库已有的检查、类型检查、构建和测试命令，但不得因此改动现有测试代码。

## Git 原则

当前开发分支为 `feature/v2-blog-website`。提交信息遵循 Conventional Commits，但当前不将格式作为阻断性 Gate。
