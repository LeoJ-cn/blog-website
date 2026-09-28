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
