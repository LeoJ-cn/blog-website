# docs 文档开发约束

- 继承仓库根目录 `AGENTS.md` 的全部约束。
- 本文件只补充 `docs/**` 的文档分类与维护规则。
- 文档默认使用简体中文，技术标识符、命令、API 和路径保留英文。
- 修改文档前只读取当前目标文档、直接引用它的规则文件，以及维持内容一致性所必需的来源；禁止为了编辑单篇文档通读整个 `docs/`。
- `docs/specifications/` 保存当前有效的工程或运行规范；`docs/references/` 保存需要长期查阅的实现基线与外部源码调研；`docs/superpowers/specs/` 保存已确认的设计；`docs/superpowers/plans/` 保存对应设计的实施计划。
- 移动、重命名或删除文档时，必须搜索并更新仓库内所有引用路径。
- 设计文档与实施计划不是默认必读材料。只有代码区域 `AGENTS.md` 按任务类型明确路由到该文档，或用户明确要求继续该设计/计划时才读取。

## 新增文档与规则路由

- 新增文档不等于必须修改 `AGENTS.md`。先判断未来执行代码任务时是否必须主动读取该文档；不需要主动读取的说明、记录和归档不得添加规则路由。
- 长期有效且相关代码每次修改都必须遵守的规范或实现基线，应在对应代码区域最近的 `AGENTS.md` 中建立长期路由。
- 只对特定任务生效的设计或实施计划，应使用“任务条件 + 精确路径”建立窄路由，禁止把整个 `specs/`、`plans/` 或 `docs/` 设为默认必读。
- 临时实施计划只在继续执行、评审或核对该计划时读取。计划完成后，应从代码区域 `AGENTS.md` 删除临时必读路由；计划文件可继续保留作为历史记录。
- `docs/AGENTS.md` 负责文档分类和路由原则，不维护全部文档文件清单。下方目录树仅用于解释结构，列出的文件只是示例，不要求新增文档逐项登记。

## 规则与文档目录说明

以下目录树供维护规则和文档结构时查阅，不是文档登记表，也不代表所有文件都需要在每次任务中读取。新增普通 Package 时，只需在对应目录创建继承规则；根 `AGENTS.md` 不维护 Package 清单。

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
    ├── references/                    # 长期参考资料；按代码领域建立长期路由
    ├── specifications/                # 长期有效规范；仅相关领域任务读取
    └── superpowers/
        ├── specs/                     # 已批准设计；使用任务条件精确路由
        └── plans/                     # 实施计划；仅继续对应计划时读取
```
