# monitoring Package 开发约束

- 继承仓库根目录 `AGENTS.md` 和 `packages/AGENTS.md` 的全部约束。
- 本文件只补充当前 Package 的专属规则。
- 涉及帧指标语义、目标帧预算、刷新率、掉帧、页面可见性、Long Animation Frame 或监控 Runtime 时，读取 `docs/superpowers/specs/2026-09-27-frame-monitor-v2-design.md`。
- 只有明确继续 Frame Monitor V2 实施计划时，才读取 `docs/superpowers/plans/2026-09-27-frame-monitor-v2.md`。
- 涉及监控能力与 Vue 性能面板的公共协议或集成边界时，读取 `docs/superpowers/specs/2026-09-27-reusable-performance-panel-design.md`；只有明确继续该实施计划时，才读取对应 plan。
- 禁止读取 low-code、Docker 或运行时服务等与当前监控任务无关的文档。
