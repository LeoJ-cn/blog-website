# @white55/visualization

面向图表与数据大屏场景的可视化能力包。

## 职责范围

- ECharts 图表实例与通用配置封装。
- 可复用图表组件、主题和数据适配器。
- 数据大屏的 Flexbox 布局、缩放与响应式能力。
- 图表和大屏共享的公开类型与组合 API。

## 边界约束

- 所有公共能力统一从 `src/index.ts` 导出。
- 通用图表能力不依赖具体业务页面或 `apps/**`。
- 大屏布局不得使用 CSS Grid。
- Day01 仅实现 ECharts 核心体系实验，不提前抽象 Day03 的通用图表平台。

## 后续初始化

```ts
import { EChartsDay01Lab } from '@white55/visualization'
```

组件内部按需注册 ECharts 图表、组件与 Canvas/SVG Renderer；调用方只通过公共入口引用。
