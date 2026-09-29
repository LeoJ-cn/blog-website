# packages 开发约束

- 继承仓库根目录 `AGENTS.md` 的全部约束。
- 本文件只补充 `packages/**` 的通用规则；与根规则冲突时，以更具体且不违反用户要求的规则为准。
- Package 必须有明确职责、边界和公共入口。
- `packages/shared` 必须保持 framework-agnostic，不得依赖 Vue、Pinia 或 Element Plus。
- 跨 Package 的公共类型放在 `packages/types`；Feature 私有类型留在 Feature 内。
- HTTP、WebSocket、Monitoring、UI 和 Config 都应通过各自 Package 的公共 API 使用，业务代码不得绕过边界直接依赖内部实现。
- Package 之间避免循环依赖，依赖方向应保持从应用到共享能力，不反向依赖应用。
