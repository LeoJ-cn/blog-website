# Three.js Demo Package

`@white55/threejs-demo` 是面向 Engineering Showcase / Developer Playground 的 Three.js Feature Package，用于集中承载后续 3D 场景、交互与工程实践。

## 当前阶段

当前只建立 Package 工程骨架，不提供具体 3D Demo、Vue 组件或运行时 API，也不接入 `apps/web`。首个真实场景落地前，不提前创建空目录或抽象层。

## 架构边界

- Vue 3 负责声明式 UI、输入参数和业务事件。
- Three.js 的 Renderer、Scene、Camera、Geometry、Material、Texture 等命令式运行时对象由普通 TypeScript 控制器持有，不进入 Vue 深层响应式状态。
- GPU 资源、DOM 事件监听器和 `requestAnimationFrame` 必须由创建者负责释放或取消。
- Package 不依赖 `apps/web`；应用层只能通过 `@white55/threejs-demo` 的公共入口使用能力。
- 当多个真实场景产生稳定的底层复用需求后，再评估是否抽取 framework-agnostic Package。

## 当前结构

```text
packages/threejs-demo/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

`src/index.ts` 是唯一公共入口。骨架阶段只建立合法 ES Module，不导出占位组件、类型或控制器。

## 后续目录建议

首个真实场景应根据实际职责按需增加目录：

- `components/`：Vue 展示组件与声明式交互边界。
- `runtime/`：Renderer、Scene、Camera 和资源生命周期编排。
- `scenes/`：按功能组织的具体 3D 场景。
- `assets/`：仅存放确需随 Package 管理的模型、纹理等静态资源。

这些目录不是预设架构，未出现真实职责前不创建。

## 依赖与公共入口

- Package 使用 Vue 3.5.13 作为对等依赖。
- 当前没有 Three.js 运行时代码，因此暂不声明 `three` 依赖。
- 首个真实场景引入 `three` 时必须使用当时确认的精确版本，并按仓库规则取得依赖安装授权。
- 所有对外能力必须从 `src/index.ts` 显式导出，调用方不得直接依赖内部文件。

## 非目标

- 当前不实现模型加载、动画、材质、后处理、WebXR 或性能监控。
- 当前不提供主站路由、导航、页面或项目卡片。
- 当前不新增测试代码、样式文件或构建管线。
