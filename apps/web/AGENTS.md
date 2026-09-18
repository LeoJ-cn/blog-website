# apps/web 开发约束

- 使用 Vue 3、TypeScript、`<script setup lang="ts">` 和 Composition API。
- 按 `app`、`pages`、`widgets`、`features`、`shared`、`assets` 组织源码。
- 技术 Demo 按 Feature 组织；第一阶段只保留入口和占位页面，不实现具体 Demo。
- Vite 与 Webpack 5 必须共享 `apps/web/src`，禁止复制业务源码。
- 路由优先采用懒加载；全局状态只放跨页面、跨 Feature 且需要长期生命周期的数据。
- Element Plus 后续必须按需引入，不允许无条件全量注册。
