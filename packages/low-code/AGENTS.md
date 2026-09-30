# low-code Package 开发约束

- 继承仓库根目录 `AGENTS.md` 和 `packages/AGENTS.md` 的全部约束。
- 本文件只补充当前 Package 的专属规则。
- 分析、修改、评审或调试逻辑编辑器、方法/变量协议、`GraphData`、节点、锚点、连线、保存流程、`processData`、`blockData` 或翻译链路前，必须完整阅读 `docs/references/logic-editor-original-implementation.md`。
- 逻辑编辑器行为以参考文档记录的原实现、迁移差异、检查清单和手动回归场景为基线；有意偏离时，变更说明必须写明原行为、目标行为和兼容影响，并同步更新参考文档。
- 仅在迁移功能、核对新旧实现差异或继续逻辑编辑器迁移工作时，读取 `docs/superpowers/specs/2026-09-28-low-code-logic-editor-migration-design.md`；只有明确执行该实施计划时，才读取 `docs/superpowers/plans/2026-09-28-low-code-logic-editor-migration.md`。
- 仅在继续执行、评审或核对当前逻辑编辑器稳定性修复时，读取 `docs/superpowers/plans/2026-09-30-low-code-logic-editor-stability-remediation.md`；普通逻辑编辑器维护不得默认读取该计划。计划完成后删除本条临时路由，计划文件保留为历史记录。
- 仅在处理 TypeScript 工程归属、公共节点协议、G6 类型或 low-code 严格类型诊断时，读取 `docs/superpowers/specs/2026-09-28-low-code-type-governance-design.md`；只有继续对应治理阶段时，才读取相关 phase plan。
- 仅在继续执行、评审或核对类型治理第三阶段时，读取 `docs/superpowers/plans/2026-09-30-low-code-type-governance-phase-3.md`；普通 low-code 维护不得默认读取。计划完成后删除本条临时路由，计划文件保留为历史记录。
- 若原仓库源码与参考文档冲突，以参考文档记录的原仓库路径和提交为线索重新核对源码。禁止静默选择其一，也禁止读取性能监控、Docker 或运行时服务等无关文档。
