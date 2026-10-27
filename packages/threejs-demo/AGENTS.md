# threejs-demo 开发约束

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md` 的全部约束。
- Three.js 的 Renderer、Scene、Camera、Geometry、Material、Texture 等运行时对象不得进入 Vue 深层响应式状态。
- GPU 资源、事件监听器和动画帧必须有明确所有者，并在所属组件或控制器卸载时成对释放。
- 新增场景或公共导出前，必须同步更新本 Package README 中的职责、公共入口与目录说明。
