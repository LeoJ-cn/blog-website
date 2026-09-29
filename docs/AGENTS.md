# docs 文档开发约束

- 继承仓库根目录 `AGENTS.md` 的全部约束。
- 本文件只补充 `docs/**` 的文档分类与维护规则。
- 文档默认使用简体中文，技术标识符、命令、API 和路径保留英文。
- 修改文档前只读取当前目标文档、直接引用它的规则文件，以及维持内容一致性所必需的来源；禁止为了编辑单篇文档通读整个 `docs/`。
- `docs/specifications/` 保存当前有效的工程或运行规范；`docs/references/` 保存需要长期查阅的实现基线与外部源码调研；`docs/superpowers/specs/` 保存已确认的设计；`docs/superpowers/plans/` 保存对应设计的实施计划。
- 移动、重命名或删除文档时，必须搜索并更新仓库内所有引用路径。
- 设计文档与实施计划不是默认必读材料。只有代码区域 `AGENTS.md` 明确路由到该文档，或用户明确要求继续该设计/计划时才读取。

## 规则与文档目录说明

以下目录树供维护规则和文档结构时查阅，不代表所有文件都需要在每次任务中读取。新增普通 Package 时，只需在对应目录创建继承规则；根 `AGENTS.md` 不维护 Package 清单。

```text
blog-website/
├── AGENTS.md                          # 全仓库通用约束和规则发现算法
├── apps/
│   └── web/
│       ├── AGENTS.md                  # Web 应用规则和专题文档路由
│       └── src/
├── packages/
│   ├── AGENTS.md                      # Packages 通用依赖和公共 API 规则
│   ├── config/AGENTS.md               # 最小占位规则
│   ├── http/AGENTS.md                 # 最小占位规则
│   ├── shared/AGENTS.md               # 最小占位规则
│   ├── types/AGENTS.md                # 最小占位规则
│   ├── ui/AGENTS.md                   # 最小占位规则
│   ├── websocket/AGENTS.md            # 最小占位规则
│   ├── low-code/
│   │   ├── AGENTS.md                  # 原实现、迁移和类型治理路由
│   │   └── src/logic-editor/
│   └── monitoring/
│       ├── AGENTS.md                  # 帧监控和性能面板路由
│       └── src/
└── docs/
    ├── AGENTS.md                      # 文档分类、维护规则和本说明
    ├── architecture/
    ├── plans/
    ├── references/                    # 长期参考资料
    │   └── logic-editor-original-implementation.md
    ├── specifications/                # 长期有效的工程规范
    │   ├── engineering-foundation.md
    │   ├── runtime-services.md
    │   └── docker-ci.md
    └── superpowers/
        ├── specs/                     # 已批准设计，仅相关领域任务读取
        │   ├── 2026-09-27-frame-monitor-v2-design.md
        │   ├── 2026-09-27-reusable-performance-panel-design.md
        │   ├── 2026-09-28-low-code-logic-editor-migration-design.md
        │   └── 2026-09-28-low-code-type-governance-design.md
        └── plans/                     # 仅继续对应计划时读取
            ├── 2026-09-27-frame-monitor-v2.md
            ├── 2026-09-27-reusable-performance-panel.md
            ├── 2026-09-28-low-code-logic-editor-migration.md
            ├── 2026-09-28-low-code-type-governance-phase-1.md
            └── 2026-09-28-low-code-type-governance-phase-2.md
```
