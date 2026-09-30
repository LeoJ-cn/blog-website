# Low-code 类型治理第三阶段实施计划

**目标：** 在不改变逻辑编辑器运行时行为和持久化格式的前提下，按目录消除阶段二剩余的 903 条局部 TypeScript 诊断。

**基线：** `packages/low-code/src` 共 903 条诊断、74 个文件；第三方源码诊断为 0。详细分布见 `packages/low-code/TYPECHECK_BASELINE.md`。

**前置设计：** `docs/superpowers/specs/2026-09-28-low-code-type-governance-design.md`

## 执行约束

- 继承仓库根目录、`packages/AGENTS.md` 和 `packages/low-code/AGENTS.md` 的全部约束。
- 不放宽已经建立的 `INodeConfig`、`NodeConfigData`、shape 回调和外部图数据守卫。
- 不新增 `any`、批量非空断言、`@ts-ignore`、`@ts-expect-error` 或 ESLint 豁免来压低诊断。
- 每个任务先用当前诊断或最小测试固定失败证据；需要新增或修改测试代码时，必须先取得用户许可。
- 不自动执行页面测试，不运行 Webpack，不新增或升级依赖。
- 每批只处理一个目录或一类明确协议；若修复会改变节点行为、锚点顺序、连线规则、翻译结果或序列化数据，立即停止并请用户确认。

## Task 1：清理 graph behavior 与公共工具边界

**范围：** `packages/low-code/src/logic-editor/graph/behavior/**`、`graph/graph-util.ts`、`graph/util/**`、`graph/shape/register-nodes.ts`

- [x] 保存本范围错误清单及错误码统计。
- [x] 为 G6 事件、Item/Node/Edge 查询结果和容器属性增加局部类型守卫；查询失败必须保留明确错误或无结果分支。
- [x] 修复回调参数隐式 `any`、`unknown` 属性访问和注册重载不匹配，不复制 G6 私有接口。
- [x] 运行相关既有测试、`pnpm typecheck:low-code`、low-code ESLint 和 `git diff --check`，记录总量变化。

## Task 2：清理 graph shape 节点局部诊断

**范围：** `packages/low-code/src/logic-editor/graph/shape/nodes/**`

- [x] 按节点文件保存诊断清单，先处理共享的尺寸、样式、锚点索引和可选回调根因。
- [x] 对可选尺寸采用明确默认值或现有构造不变量；对数组索引和锚点查找保留不存在分支。
- [x] 对 G6 兼容边界使用公开类型和窄适配，不修改坐标、anchor 顺序、图标、注册名或函数体业务逻辑。
- [x] 复核每个节点 diff；运行 shape 类型测试、`pnpm typecheck:low-code`、low-code ESLint、Vite 构建和 `git diff --check`。

## Task 3：清理 service 与 handler

**范围：** `packages/low-code/src/logic-editor/service/**`、`handler/**`

- [x] 分别保存 service 和 handler 的错误清单。
- [x] 修复缓存查询、支线索引、翻译器局部变量和配置服务参数的空值/索引边界；禁止用占位值掩盖非法图结构。
- [x] 翻译节点的输入、输出和返回锚点缺失时，沿用原实现语义并提供明确失败信息。
- [x] 运行节点守卫测试、相关既有测试、`pnpm typecheck:low-code`、low-code ESLint、Vite 构建和 `git diff --check`。

## Task 4：清理 runtime、TSX 与剩余单文件诊断

**范围：** `packages/low-code/src/logic-editor/runtime/**` 以及前述任务完成后的剩余文件。

- [x] 重新统计剩余诊断，按错误码和文件排序。
- [x] 处理运行时节点参数、外部 `unknown`、递归返回类型和 TSX 事件签名；不改变执行顺序和副作用。
- [x] 确认正常 workspace 链接后的 lodash 声明状态；若诊断已消失，不进行源码修复。
- [x] 运行相关既有测试、`pnpm typecheck:low-code`、全仓 lint、Vite 构建和 `git diff --check`。

## Task 5：建立清零基线与常规 Gate

- [x] 要求 `pnpm typecheck:low-code` 退出码为 0；不得用排除目录或降低 strict 选项达成。
- [x] 更新 `packages/low-code/TYPECHECK_BASELINE.md`，保留阶段一、二历史数据并记录第三阶段结果。
- [x] 评估将 low-code 类型检查接入根 `typecheck` 的影响；任何脚本或 CI Gate 变更单独列出并请用户确认。
- [x] 提供逻辑编辑器手动回归步骤与预期结果，由用户执行页面验证。

## 阶段完成条件

- `pnpm typecheck:low-code` 无诊断并退出码为 0。
- 已授权且适用的测试、low-code ESLint、全仓 lint、Vite 构建和 `git diff --check` 全部通过。
- 第三方源码保持 0 条诊断，节点核心协议未被放宽。
- 页面交互验证由用户完成，结果记录到最终交付说明。

## 执行记录

### Task 1（2026-09-30）

- `behavior`、`graph-util.ts`、`graph/util` 和 `shape/register-nodes.ts` 的类型诊断已清零。
- 阶段三全包诊断从 903 条降为 627 条，减少 276 条；Task 1 触碰文件均无剩余诊断。
- 使用 G6 公开类型、事件目标守卫和明确的画布生命周期校验替代私有 `_cfg` 读取及不安全断言，未改变拖拽、连线、选中和删除流程。
- 节点守卫测试 3/3、shape 协议类型测试、low-code ESLint 和 `git diff --check` 均通过。

### Task 2（2026-09-30）

- `graph/shape/nodes/**` 类型诊断已清零，阶段三全包诊断从 627 条降为 155 条；从中断恢复点的 237 条继续减少 82 条。
- shape 回调统一沿用泛型节点数据协议，对可选回调、图形查询、锚点索引和标签/类型字段增加了明确边界处理，没有调整节点注册名、锚点顺序或绘制坐标。
- shape 协议类型测试、目标目录 ESLint、Vite 构建和 `git diff --check` 均通过；`pnpm typecheck:low-code` 的剩余 155 条均不在 shape nodes 范围。

### Task 3（2026-09-30）

- `service/**` 与 `handler/**` 类型诊断已清零，全包诊断从 155 条降为 97 条；handler 基线为 0，service 共清理 58 条。
- 对缺失锚点、连线端点、变量记录和翻译过程数据采用明确失败分支，避免未初始化值进入生成结果；缓存重置仍保持可用的空对象状态。
- 节点守卫测试 3/3、目标目录 ESLint、Vite 构建和 `git diff --check` 均通过；首次未带类型剥离参数的 Node 测试未进入用例，使用 `--experimental-strip-types` 后通过。

### Task 4（2026-09-30）

- runtime、edge、compat 和剩余 TSX 诊断全部清零，全包诊断从 97 条降为 0。
- 公共过程节点构造器对不支持的类型和空变量路径改为明确失败；递归值转换、API/条件节点参数及 G6 edge 回调均建立了窄类型边界。
- lodash 在当前 workspace 链接下无声明诊断；uuid 7 未携带声明，补充了仅覆盖实际使用的本地 `v4(): string` 声明。
- 节点守卫测试 3/3、shape 类型检查、`pnpm typecheck:low-code`、全仓 ESLint、Vite 构建和 `git diff --check` 均通过。

### Task 5（2026-09-30）

- `TYPECHECK_BASELINE.md` 已保留阶段一、二数据并记录阶段三从 903 条到 0 条的结果；`pnpm typecheck:low-code` 和现有根 `pnpm typecheck` 均通过。
- 用户已确认把 low-code 接入根 Gate；根 `typecheck` 现依次执行 Web 与 `@blog/low-code` 类型检查。

#### 用户手动页面回归步骤与预期

1. 从首页点击“编辑方法”打开逻辑编辑器。预期：弹框打开，方法列表画布已有方法节点，不出现空白画布或控制台异常。
2. 在“方法”与“变量”页签间往返切换。预期：各自图数据独立保留，切回方法后原节点和连线完整显示。
3. 打开默认方法，分别把返回值类型从“空”改为“文本”、再改回“空”。预期：返回值锚点随配置出现和消失，配置可以修改并确认。
4. 在方法详情中保存默认 `start → end` 流程。预期：无 `anchors` 异常；无返回值时不出现“结束块未指定返回值”警告。
5. 配置有返回值的方法但不连接结束节点返回值，然后保存。预期：只出现明确的返回值连线提示，不抛出运行时异常。
6. 添加、删除方法参数并保存。预期：函数节点参数锚点数量、顺序、标签与配置一致。
7. 添加 try/catch、逻辑判断或网络请求节点，缺少必要连线时保存。预期：提示指出具体缺失锚点或连线，不生成包含未初始化变量的流程数据。
8. 完成一个合法流程后点击保存。预期：编辑器关闭，首页展示本次保存生成的 `processData`。
9. 再次打开同一方法。预期：之前保存的图数据可以恢复，缩略图与主画布一致。
10. 连续关闭、打开并保存两次。预期：保存、选中和删除事件各触发一次，不出现重复监听。

#### 最终验证与审查

- 最终验证：接入 low-code 后的根 `pnpm typecheck`、独立 `pnpm typecheck:low-code`、全仓 ESLint、节点守卫测试 3/3、shape 类型检查、Vite 构建和 `git diff --check` 全部通过。
- 最终审查：由于当前共享工作区没有可用的新提交区间，`review-package` 无法生成提交范围；依据现有暂存边界约束，改为对 `git diff HEAD` 做分批自审查，未发现 Critical 或 Important 问题。
- 页面验证：未自动启动或操作页面，以上 10 项由用户手动执行并反馈结果。
