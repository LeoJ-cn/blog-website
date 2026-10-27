# Three.js Demo Package 设计

## 意图

在 Monorepo 中新增独立 Feature Package `@white55/threejs-demo`，作为后续 Three.js 相关场景、交互和工程实践的统一承载边界。该 Package 面向 Engineering Showcase / Developer Playground，不与 ECharts 可视化能力或 Web 应用路由耦合。

## 目标

- 建立 `packages/threejs-demo` 的最小工程骨架。
- 明确 Vue 3 声明式 UI 与 Three.js 命令式运行时之间的边界。
- 提供唯一公共入口 `src/index.ts`，后续能力只能通过该入口对外暴露。
- 使用独立 README 记录职责、依赖方向、目录约定和后续扩展方式。
- 保持 Package 可由主站按需接入，但本阶段不建立应用层依赖。

## 非目标

- 不实现具体 3D 场景、模型加载、动画、材质、后处理或性能面板。
- 不新增主站路由、导航、页面或项目卡片。
- 不抽取通用 Three.js 基础设施，也不提前设计尚无消费者的抽象层。
- 不新增或修改测试代码。
- 不自动安装依赖、启动页面、操作浏览器或执行 Webpack 命令。

## 约束

- 遵循根目录与 `packages/AGENTS.md` 的全部规则，并为新 Package 增加只声明继承关系和局部边界的 `AGENTS.md`。
- 所有依赖必须使用精确版本，禁止 `^`、`~`、`*` 和 `latest`。
- Vue 代码使用 Vue 3、Composition API、`<script setup lang="ts">` 和明确类型契约。
- Three.js 的 `Scene`、`Renderer`、`Camera`、Geometry、Material、Texture 等运行时对象不得进入 Vue 深层响应式状态；未来由普通 TypeScript 控制器持有并负责释放。
- 自有前端样式不得使用 CSS Grid；后续布局使用 Flexbox、媒体查询或合理的定位方式。
- 当前骨架不导出占位组件或虚假运行时 API；`src/index.ts` 仅建立模块入口，首个真实能力落地时再增加稳定导出。

## 方案比较

### 方案 1：独立 Feature Package（已选择）

创建 `@white55/threejs-demo`，集中承载 Three.js 展示能力。它与 `@white55/openlayers-gis-demo` 的领域 Package 形态一致，依赖和生命周期边界清晰，也便于未来按场景拆分组件与控制器。

### 方案 2：通用 Three.js 能力包

创建 `@white55/three`，只封装底层渲染能力。该方案适合已有多个消费者时抽取复用，但当前会产生未经需求验证的抽象，且不能直接表达“功能展示”的目标，因此不采用。

### 方案 3：并入 `@white55/visualization`

把 Three.js 能力放入现有 ECharts Package。文件数量较少，但 2D 图表和 WebGL 场景的依赖、资源生命周期与演进方向不同，会削弱 Package 职责边界，因此不采用。

## Package 结构

```text
packages/threejs-demo/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

- `AGENTS.md`：继承根目录与 `packages/AGENTS.md`，补充 Three.js 运行时对象所有权及资源释放约束。
- `README.md`：说明 Package 定位、当前阶段、架构边界和未来目录演进建议。
- `package.json`：声明私有 Workspace Package、ES Module、公共入口和独立 `typecheck` 命令。
- `tsconfig.json`：继承根 TypeScript 配置，并包含 DOM 类型环境。
- `src/index.ts`：唯一公共入口；骨架阶段不暴露尚未实现的能力。

## 依赖与公共边界

- Package 名称为 `@white55/threejs-demo`。
- `vue` 作为 `peerDependencies` 与开发期类型依赖，版本与仓库现有 Vue 版本保持一致。
- `three` 是未来运行时核心依赖；实施前先确认精确版本，并在需要更新 lockfile 或安装依赖时给出命令、等待用户确认。
- Package 不得依赖 `apps/web`，主站未来只能通过 `@white55/threejs-demo` 公共入口消费能力。
- 若未来出现多个 Three.js Feature 的稳定复用需求，再单独评估是否抽取 framework-agnostic 的底层 Package，不在本阶段预留空抽象。

## 后续演进边界

首个真实 Demo 落地时，应根据场景再设计组件职责、控制器生命周期和公开协议。预计可演进出 `components/`、`runtime/`、`scenes/`、`assets/` 等目录，但本次不创建空目录。所有 GPU 资源、事件监听器和动画帧必须有明确所有者，并在卸载时成对释放。

## 留给实施计划的事项

- 核对并选择 `three` 的精确版本，以及是否需要独立的类型依赖。
- 明确在未获依赖安装授权时，`package.json` 与 `pnpm-lock.yaml` 的处理顺序。
- 创建骨架文件并验证 JSON、TypeScript 配置与 Package 边界。
- 只在用户另行授权自动执行非页面检查后运行对应验证命令。
