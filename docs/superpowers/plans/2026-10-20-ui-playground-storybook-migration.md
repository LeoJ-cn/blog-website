# UI Playground 迁移到独立 Storybook 的实施计划

## 状态与范围

本计划依据 [UI 组件库设计](../specs/2026-10-19-ui-library-design.md) 和用户确认的单次 GitHub Pages 部署方案编写。迁移实现已写入工作区，依赖由用户按确认的精确版本安装；页面交互和线上部署仍待用户手动验收。本批只迁移组件展示能力；`@white55/ui` 的八个组件及 `ui-docs` 简介包继续保留，GIS 和既有 Web 技术 Demo 不修改。

目标是在原 `packages/ui-playground` 中将站内演示替换为独立构建的 Storybook，不移动目录，也不新建 `apps/ui-playground`。Web 保留与 Solutions 平级的“UI 组件库”分类，仅显示“组件文档”侧栏项；文档页中的 Storybook 链接在新标签页打开。完整 Storybook 不通过 iframe 嵌入 Web。此目录位置按用户明确要求作为仓库“可运行应用通常放在 `apps/`”原则的例外，包的用途限定为 UI 组件开发与展示工具。

## 目标结构与 URL

```text
apps/web                  Web 首页与组件文档路由
packages/ui-playground    原位置独立开发和构建的 Storybook
packages/ui               八个组件及公共样式入口
packages/ui-docs          站内组件文档

dist-vite/index.html      https://www.leoj.top/#/
dist-vite/storybook/      https://www.leoj.top/storybook/
```

Web 的组件文档页只保留组件库简介与 Storybook 首页链接，点击后在新标签页打开；原 `/playground/ui/playground/:component?` 统一重定向到简介页，兼容旧书签。Storybook 中切换组件后由其自身管理 URL 和导航，原 Web 标签页保持不变。

## 实施步骤

1. **版本与许可**：核对仓库 Node、Vue、Vite 版本和 Storybook Vue/Vite 框架的兼容性；列出 `storybook`、`@storybook/vue3-vite` 及确有需要的插件精确版本与安装命令，等待用户对本次安装明确确认。不得使用 `latest`、版本范围或自动初始化器改写仓库。
2. **原包改造**：保留 `packages/ui-playground` 的目录与包名，在该包内用 Storybook 替换旧站内演示，并更新本包 `AGENTS.md` 中“只维护站内演示”的过时职责说明。该包的对外契约改为开发/构建命令与静态产物，不再提供 Web 运行时页面入口；只依赖 `@white55/ui` 公共入口、Vue、Element Plus 和 Storybook 所需构建依赖，不反向依赖 Web。更新锁文件前先取得安装确认。删除旧八个站内演示及专属样式，避免双份示例源。
3. **Storybook 内容**：配置 Vue 3 + Vite、Element Plus 基础样式、UI Token/主题和按需组件样式；为 Button、Input、Dialog、Loading、EmptyState、Select、Form、Table 建立可操作 stories。组件导航由 Storybook 管理。只写展示 stories；不创建 `play`、断言、快照、夹具或其他测试代码，除非另行取得准确的测试代码授权。
4. **Web 接入**：在 UI 分类配置中只保留“组件文档”，简介页仅保留图示中的说明与 Storybook 首页链接，并新开标签；删除组件列表、详情、API 和示例。原 `ui/playground/:component?` 只作旧书签重定向。移除 `@white55/web` 对旧 `ui-playground` 包的运行时依赖。生产链接从当前站点基地址解析到 `storybook/`；本地链接指向单独运行的 Storybook 服务，不让 Web 开发服务器误指向不存在的静态目录。
5. **单次部署**：保持现有 GitHub Pages 工作流的 `folder: dist-vite` 与 `branch: static-pages`。先执行 Web 的 `pnpm build:vite`，再将 Storybook 独立产物写入 `dist-vite/storybook/`；第二步不得清空 `dist-vite` 根目录。只发布一次整个目录。检查 Web 根 `index.html`、Storybook 的 `index.html`、JS/CSS 与图片字体资源均可从自定义域名正确访问。
6. **清理与交付**：更新不再准确的包引用、使用说明和设计描述，审查依赖方向、公开协议、简体中文注释和自有样式无 CSS Grid。核对本批触碰文件的完整类型诊断、Lint 与 Vite 构建；不执行 Webpack。

## 验收边界

- `https://www.leoj.top/#/` 仍加载 Web 首页；`https://www.leoj.top/storybook/` 加载完整 Storybook，两个入口都来自同一次 Pages 发布。
- Web 左侧 UI 分类仍由现有配置生成，只显示“组件文档”；简介页只展示说明和 Storybook 首页链接，新开标签。旧 `/playground/ui/playground/button` 重定向到同一简介页。
- `packages/ui-playground` 仍在原目录，Storybook 独立打包且不进入 Web 的 JS bundle；原站内八个演示不再参与构建。
- 本地开发时分别启动 Web 与 Storybook；不要求 Web 开发服务器承载 Storybook 静态产物。
- 自动页面启动、浏览器操作和页面调试未获当前任务授权，交互与部署 URL 由用户手动验证。若用户不要求自动执行非页面测试，提供具体命令和预期结果供手动执行。

## 风险与处理

- **输出清空**：Web 的 Vite 构建配置会清空 `dist-vite`，因此 CI 顺序固定为 Web 在前、Storybook 在后。
- **静态子路径**：Storybook 及 stories 中的资源不能假设部署在域名根目录，须核对 `storybook/` 下的相对引用。
- **双份维护**：迁移后 Storybook stories 是唯一组件目录、API 和交互示例源；`ui-docs` 只保留简介与外链。
- **发布时机**：原包改造、文档链接和部署步骤必须作为同一批变更通过验证后发布，不能先发布指向不存在的 Storybook 的文档外链。
