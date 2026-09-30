# Low-code TypeScript 严格检查基线

## 基线信息

- 日期：2026-09-28
- 命令：`pnpm typecheck:low-code`
- TypeScript：`5.6.3`
- 配置：`packages/low-code/tsconfig.json`
- 当前结果：预期失败；第一阶段只建立真实检查边界，不通过降低严格度隐藏错误。

编辑器此前出现的 `react/jsx-runtime` 和 `JSX.IntrinsicElements` 诊断已经消除。low-code 的 TSX 现在使用 `jsx: "preserve"` 与 `jsxImportSource: "vue"`。

## 诊断总量

| 范围 | 错误数 | 涉及文件数 |
| --- | ---: | ---: |
| `packages/low-code/src` | 2171 | 112 |
| `node_modules` 第三方源码 | 55 | 2 |
| 合计 | 2226 | 114 |

第三方源码的 55 条诊断全部来自 `@antv/g-base@0.5.16`。当前 low-code 直接从该包的 `src` 路径导入类型，导致第三方实现源码进入本项目的严格检查范围；这部分不能计入 low-code 自身错误数。

## low-code 高频错误码

| 错误码 | 数量 | 主要含义 |
| --- | ---: | --- |
| `TS18048` | 1477 | 节点或图协议字段可能为 `undefined` |
| `TS7006` | 129 | 参数隐式为 `any` |
| `TS2322` | 112 | 声明类型与实际赋值不兼容 |
| `TS2345` | 87 | 调用参数与接口不兼容 |
| `TS2722` | 73 | 可能为 `undefined` 的函数被调用 |
| `TS7016` | 69 | lodash 声明在当前 node_modules 链接状态下不可见 |
| `TS2571` | 55 | 对 `unknown` 值直接操作 |
| `TS2532` | 48 | 对可能为 `undefined` 的对象直接访问 |
| `TS7005` | 26 | 变量隐式包含 `any` |
| `TS7034` | 18 | 空数组等变量无法推断元素类型 |
| `TS18046` | 13 | catch 或外部值为 `unknown` |
| `TS2454` | 13 | 变量在赋值前使用 |
| 其他错误码 | 69 | 索引、返回值、泛型约束和参数数量等问题 |

`@types/lodash: 4.17.25` 已作为 low-code 的直接开发依赖写入 package manifest 和锁文件。按用户授权仅更新锁文件，没有清空并重装现有 `node_modules`，因此当前工作区尚未生成对应包内链接。后续在正常 workspace 安装后应先复查 `TS7016`；若消失，不作为源码治理任务。

## 目录分布

| 目录 | 错误数 |
| --- | ---: |
| `logic-editor/graph` | 1813 |
| `logic-editor/service` | 169 |
| `logic-editor/handler` | 84 |
| `logic-editor/runtime` | 69 |
| TSX 组件与其他实现 | 22 |
| `compat`、types 和其余文件 | 14 |

`graph` 占绝大多数，主要原因不是 1813 个独立缺陷，而是节点公共协议将 `data`、anchors 及 G6 model 字段表达为可选后，在每个节点 shape 中重复触发空值诊断。

## 阶段二优先根因

阶段二只处理能影响多个目录的公共协议与依赖边界：

1. 核对 `INodeConfig`、`NodeConfigData` 和 G6 `NodeConfig` 的交叉类型，明确生产节点的 `data` 是否必须存在。
2. 明确 anchors 的构造完成条件、索引语义和空数组边界，使用构造器或类型守卫建立不变量。
3. 收敛 `GraphData`、节点、边和 G6 `Item` 之间的转换边界，避免在调用方反复断言。
4. 将 `@antv/g-base/src` 等源码级类型导入替换为公开类型入口或包内最小兼容接口，移除 55 条第三方源码诊断。
5. 在 node_modules 正常链接后复查 lodash 声明；只有仍然存在的 `TS7016` 才进入源码修复范围。

单文件的隐式 `any`、赋值前使用和索引错误留到阶段三按目录处理。

## 治理约束

- 保持根配置的 `strict: true`。
- 不新增批量 `any`、`@ts-ignore`、`@ts-expect-error` 或非空断言来压低数字。
- 不扩大 `eslint.config.mjs` 的迁移豁免。
- 每批修改后重新统计 low-code 自身错误、第三方错误、涉及文件和目录分布。
- 第一阶段允许 `pnpm typecheck:low-code` 非 0 退出；最终阶段必须清零后才能纳入常规工程 Gate。

## 阶段二结果（2026-09-30）

阶段二继续使用 `pnpm typecheck:low-code` 统计，并保留第一阶段数据作为历史基线。当前检查仍预期失败，但公共协议和第三方依赖边界已经收敛。

| 范围 | 第一阶段 | 阶段二 | 变化 |
| --- | ---: | ---: | ---: |
| `packages/low-code/src` | 2171 | 903 | -1268 |
| 涉及 low-code 文件 | 112 | 74 | -38 |
| `node_modules` 第三方源码 | 55 | 0 | -55 |
| 合计 | 2226 | 903 | -1323 |

### 阶段二高频错误码

| 错误码 | 数量 | 后续处理方向 |
| --- | ---: | --- |
| `TS18048` | 354 | 图层可选尺寸、样式和锚点局部边界 |
| `TS7006` | 91 | behavior、shape 和运行时回调参数 |
| `TS2322` | 83 | G6 回调兼容边界与具体实现返回值 |
| `TS2345` | 72 | 图模型、边模型及翻译器参数收窄 |
| `TS2722` | 71 | 可选回调调用前的存在性判断 |
| `TS2571` | 55 | G6 容器属性的 `unknown` 收窄 |
| `TS2532` | 44 | 数组索引和可选查询结果边界 |
| `TS7005` | 26 | 空数组和临时变量显式元素类型 |
| `TS7034` | 18 | 无初始类型信息的局部变量 |
| `TS18046` | 13 | 外部值和 G6 属性的 `unknown` 收窄 |
| `TS2454` | 13 | 翻译器变量赋值前使用 |
| `TS2769` | 13 | G6 注册及重载调用协议 |
| 其他错误码 | 50 | 索引签名、返回值、递归返回类型等局部问题 |

### 阶段二目录分布

| 目录 | 错误数 |
| --- | ---: |
| `logic-editor/graph` | 728 |
| `logic-editor/runtime` | 69 |
| `logic-editor/service` | 58 |
| `logic-editor/handler` | 37 |
| `logic-editor` 其他实现 | 11 |

### 已消除的公共根因

1. G6 和 G Base 类型只从公开入口导入，`@antv/g-base/src` 不再进入本项目检查图，第三方诊断从 55 降为 0。
2. `INodeConfig` 明确要求非空 `id`、`type`、`data` 和 `data.anchors`，并由 `isNodeConfig`、`assertNodeConfig` 在持久化图、拖拽 model 和缓存入口校验。
3. 方法、变量、API、模板和变量详情构造器输出完整核心节点协议；复制节点时会同步锚点的 `nodeId`。
4. G6 内部 shape 回调的 `cfg`、`group` 改为必需参数，38 个生产节点实现完成机械对齐；G6 注册边界的 `getAnchorPoints(cfg?)` 仍保持兼容。

### 阶段三入口

阶段二结果低于计划要求的 1000 条门槛。阶段三按最新分布处理局部问题，顺序为：

1. `logic-editor/graph`：先处理 behavior 和 shape 的 G6 `unknown`、可选尺寸以及注册边界。
2. `logic-editor/service`：处理缓存查询返回值、支线索引和翻译器局部空值。
3. `logic-editor/handler`：处理配置服务与事件参数。
4. `logic-editor/runtime`：处理剩余 lodash 声明和运行时节点类型。
5. TSX 组件与其他单文件错误。

阶段三不得重新放宽已稳定的节点核心协议，也不得通过排除目录降低诊断数量。

## 阶段三结果（2026-09-30）

阶段三完成按目录清理，`pnpm typecheck:low-code` 当前无诊断并以退出码 0 结束；`strict: true`、检查范围和第三方源码边界均未放宽。

| 范围 | 第一阶段 | 阶段二 | 阶段三 | 相比第一阶段 |
| --- | ---: | ---: | ---: | ---: |
| `packages/low-code/src` | 2171 | 903 | 0 | -2171 |
| 涉及 low-code 文件 | 112 | 74 | 0 | -112 |
| `node_modules` 第三方源码 | 55 | 0 | 0 | -55 |
| 合计 | 2226 | 903 | 0 | -2226 |

### 阶段三分批结果

| 任务 | 处理范围 | 批次结束诊断数 |
| --- | --- | ---: |
| Task 1 | graph behavior、graph util、register-nodes | 627 |
| Task 2 | graph shape nodes | 155 |
| Task 3 | service、handler | 97 |
| Task 4 | runtime、edge、compat、剩余 TSX | 0 |

### 当前类型边界

1. 节点核心协议继续要求非空 `id`、`type`、`data` 和 `data.anchors`，外部图数据通过守卫进入内部实现。
2. G6 回调兼容性集中在注册和事件边界处理，不复制第三方私有接口。
3. lodash 声明在正常 workspace 链接下可见；`uuid@7.0.3` 未携带声明，项目仅为实际使用的 `v4(): string` 提供最小本地声明。
4. 无 `@ts-ignore`、`@ts-expect-error`、排除目录或 strict 降级用于实现清零。

### Gate 评估

经用户确认，根 `pnpm typecheck` 已串行执行 Web 应用的 `vue-tsc` 与 `@blog/low-code` 的独立类型检查。任何一侧失败都会使根命令以非 0 退出，从而避免常规检查遗漏 low-code 回归。
