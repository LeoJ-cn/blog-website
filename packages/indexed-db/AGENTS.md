# indexed-db Package 约束

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md` 的全部约束。
- 本 Package 必须保持 framework-agnostic，不得依赖 Vue、Pinia、OpenLayers 或任何 Feature 领域类型。
- 公共能力统一从 `src/index.ts` 导出，禁止调用方依赖内部 Adapter、Registry、Schema 或 Key 工具。
- 只提供 IndexedDB 优先、Memory 降级的异步 Key-Value 能力，不增加 LocalStorage Adapter。
- 依赖必须使用精确版本；新增或修改测试代码仍须先取得用户准确回复 `允许添加测试代码`。
