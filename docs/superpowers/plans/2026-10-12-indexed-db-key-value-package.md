# `@blog/indexed-db` Key-Value Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个可被所有 Feature Package 复用、调用方式接近异步 `localStorage` 的 `@blog/indexed-db` Key-Value 子包，并在 IndexedDB 不可用时透明降级到页面生命周期内的内存存储。

**Architecture:** 公共 `KeyValueStore` 协议只暴露 Key-Value、前缀枚举和批量原子操作；`createKeyValueStore` 负责在 `IndexedDbKeyValueStore` 与 `MemoryKeyValueStore` 之间选择和运行时降级。Feature Package 自己定义 Key 和 Value 结构，不直接依赖 `idb` 或底层 Object Store。

**Tech Stack:** TypeScript 5.6.3、pnpm Workspace、`idb@7.1.1`、浏览器 IndexedDB、`structuredClone`

**Spec:** `docs/superpowers/specs/2026-10-11-indexed-db-key-value-design.md`

## Global Constraints

- 只创建 `packages/indexed-db/**` 和本实施计划要求的文档，不接入 GIS、`apps/web` 或其他 Feature Package。
- Package 名称固定为 `@blog/indexed-db`，运行依赖固定为精确版本 `idb@7.1.1`，禁止版本范围符号。
- 公共 API 不导入 Vue、Pinia、OpenLayers、GIS、HTTP 或其他 Feature 领域类型。
- IndexedDB 只使用 Schema Version `1` 和名为 `entries` 的单一 Object Store。
- 内部 Key 格式固定为 `${namespace}\u0000${callerKey}`；公共 API 永不暴露内部前缀。
- IndexedDB 不可用、打开失败、打开受阻或连接异常终止时降级到 Memory Adapter；配额不足和调用错误不得静默降级。
- Memory Adapter 的数据只保留到页面生命周期结束，且读写都遵循 structured clone 隔离。
- 用户已明确要求本批不添加测试代码：禁止创建、修改或生成测试文件、测试用例、fixture、测试辅助代码或临时测试脚本；本计划不执行 TDD。
- 非页面检查是否由 Agent 执行必须另行询问用户；未经允许只提供命令和预期结果。
- 不运行页面、浏览器自动化或任何 Webpack 命令。
- 所有非直观公开状态、错误码、生命周期和边界语义使用简体中文注释。

## Review Focus

由于用户禁止本批新增测试代码，以下风险通过实现审查、类型检查和用户后续集成验证覆盖，不创建测试用例：

1. 包含空白、`\u0000` 或高位 Unicode 的 Key/namespace：必须拒绝空 Key 和含分隔符的 namespace，前缀枚举不得越过当前 namespace。
2. `get` 返回可变对象、Blob、Map 或循环对象：IndexedDB 使用原生 structured clone；Memory Adapter 必须通过 `structuredClone` 防止引用污染，克隆失败统一为 `CLONE_FAILED`。
3. 批量写入中途失败：IndexedDB Transaction 和 Memory 临时副本都必须保持全有或全无。
4. 连接 blocked、terminated 或 Store 已 close：blocked/terminated 进入明确 Memory 降级状态，close 后所有数据方法返回 `STORE_CLOSED`。
5. 多实例使用同一 databaseName/namespace：IndexedDB 共享浏览器数据库；Memory Adapter 在当前页面共享同一 Map，关闭一个实例不能清空其他实例数据。

---

### Task 1: Package 骨架与公共协议

**Files:**

- Create: `packages/indexed-db/AGENTS.md`
- Create: `packages/indexed-db/package.json`
- Create: `packages/indexed-db/tsconfig.json`
- Create: `packages/indexed-db/src/types.ts`
- Create: `packages/indexed-db/src/errors.ts`
- Create: `packages/indexed-db/src/internal/key.ts`
- Create: `packages/indexed-db/src/index.ts`
- Modify: `pnpm-lock.yaml`（仅由获准后的 pnpm 安装生成）

**Interfaces:**

- Consumes: 根 `AGENTS.md`、`packages/AGENTS.md`、设计文档公共协议。
- Produces: `CreateKeyValueStoreOptions`、`StorageEngine`、`StorageRuntimeState`、`StorageErrorCode`、`KeyValueStore`、`KeyValueStorageError`、内部 Key 工具。

- [ ] **Step 1: 创建 Package 局部规则**

在 `packages/indexed-db/AGENTS.md` 声明：继承根和 `packages/AGENTS.md`；保持 framework-agnostic；公共入口只能从 `src/index.ts` 导出；禁止加入领域 Key、Vue 绑定或 LocalStorage Adapter；继续执行精确依赖和测试授权规则。

- [ ] **Step 2: 创建 Package 配置**

`packages/indexed-db/package.json` 使用：

```json
{
  "name": "@blog/indexed-db",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "idb": "7.1.1"
  }
}
```

`packages/indexed-db/tsconfig.json` 继承根 `../../tsconfig.json`，配置 `lib: ["ES2022", "DOM"]`、`types: []`，并只包含 `src/**/*.ts`。

- [ ] **Step 3: 请求安装依赖许可并安装精确版本**

向用户展示并等待安装确认：

```bash
pnpm install --filter @blog/indexed-db
```

未获得确认时不执行，并在后续步骤中将依赖解析和类型检查标为未验证。获得确认后只允许由 pnpm 更新新 Package 与 `pnpm-lock.yaml` 的 `idb@7.1.1` 记录。

- [ ] **Step 4: 定义公共类型**

在 `src/types.ts` 定义与设计文档完全一致的：

```ts
export type StorageEngine = 'indexed-db' | 'memory'
export type StorageErrorCode =
  | 'INDEXED_DB_UNSUPPORTED'
  | 'OPEN_BLOCKED'
  | 'CONNECTION_TERMINATED'
  | 'QUOTA_EXCEEDED'
  | 'TRANSACTION_ABORTED'
  | 'CONSTRAINT_VIOLATION'
  | 'INVALID_KEY'
  | 'STORE_CLOSED'
  | 'CLONE_FAILED'
  | 'UNKNOWN'

export interface StorageRuntimeState {
  engine: StorageEngine
  persistent: boolean
  fallbackReason: StorageErrorCode | null
}

export interface CreateKeyValueStoreOptions {
  databaseName: string
  namespace: string
  fallback: 'memory'
  onRuntimeStateChange?: (state: StorageRuntimeState) => void
}

export interface KeyValueStore {
  readonly state: StorageRuntimeState
  get<Value>(key: string): Promise<Value | undefined>
  set<Value>(key: string, value: Value): Promise<void>
  has(key: string): Promise<boolean>
  delete(key: string): Promise<void>
  keys(options?: { prefix?: string }): Promise<string[]>
  entries<Value>(options?: { prefix?: string }): Promise<Array<readonly [string, Value]>>
  setMany(entries: ReadonlyArray<readonly [string, unknown]>): Promise<void>
  deleteMany(keys: readonly string[]): Promise<void>
  clear(options?: { prefix?: string }): Promise<void>
  close(): void
}
```

每个错误码、`persistent`、`fallbackReason`、批量原子语义和 close 后行为必须有准确简体中文注释。

- [ ] **Step 5: 实现统一错误**

在 `src/errors.ts` 实现：

```ts
export class KeyValueStorageError extends Error {
  readonly code: StorageErrorCode
  readonly cause?: unknown
  constructor(code: StorageErrorCode, message: string, options?: { cause?: unknown })
}

export function toKeyValueStorageError(error: unknown): KeyValueStorageError
```

将 DOMException 名称映射为：`QuotaExceededError → QUOTA_EXCEEDED`、`AbortError → TRANSACTION_ABORTED`、`ConstraintError → CONSTRAINT_VIOLATION`、`DataCloneError → CLONE_FAILED`；未知错误不得包含被保存 Value 的内容。

- [ ] **Step 6: 实现内部 Key 规则**

在 `src/internal/key.ts` 定义：

```ts
export const KEY_SEPARATOR = '\u0000'
export function normalizeDatabaseName(value: string): string
export function normalizeNamespace(value: string): string
export function validateCallerKey(key: string): string
export function toInternalKey(namespace: string, callerKey: string): string
export function toNamespacePrefix(namespace: string, callerPrefix?: string): string
export function fromInternalKey(namespace: string, internalKey: string): string
```

数据库名和 namespace 使用 trim 后值；两者为空时抛 `INVALID_KEY`，namespace 包含 `KEY_SEPARATOR` 时拒绝。Caller Key 保留原始字符，只用 `trim()` 判断是否为空；前缀允许空字符串。`fromInternalKey` 遇到不属于当前 namespace 的 Key 时抛 `INVALID_KEY`。

- [ ] **Step 7: 建立唯一公共入口**

`src/index.ts` 只导出公共类型、`KeyValueStorageError` 和后续 Task 3 产生的 `createKeyValueStore`；不得导出内部 Key 工具或 Adapter class。

- [ ] **Step 8: 完整检查 Task 1 触碰文件**

人工检查 Package/tsconfig/公开协议、错误成员注释、依赖精确版本和内部 Key 边界；确认没有测试文件、测试脚本、CSS 或 Feature 领域类型。

- [ ] **Step 9: 提交 Task 1**

```bash
git add packages/indexed-db/AGENTS.md packages/indexed-db/package.json packages/indexed-db/tsconfig.json packages/indexed-db/src pnpm-lock.yaml
git commit -m "feat: define indexed db key value package"
```

提交前检查暂存区，`pnpm-lock.yaml` 未变化时从命令中移除；不得包含用户未跟踪的 GIS 文档。

---

### Task 2: Memory Key-Value Adapter

**Files:**

- Create: `packages/indexed-db/src/internal/clone.ts`
- Create: `packages/indexed-db/src/memory/memory-registry.ts`
- Create: `packages/indexed-db/src/memory/memory-key-value-store.ts`

**Interfaces:**

- Consumes: Task 1 的 `KeyValueStore`、`StorageRuntimeState`、`KeyValueStorageError` 和 Key 工具。
- Produces: 内部 `createMemoryKeyValueStore(options, fallbackReason): KeyValueStore`；Task 3 的降级 Facade 使用。

- [ ] **Step 1: 实现 structured clone 边界**

在 `src/internal/clone.ts` 实现：

```ts
export function cloneStoredValue<Value>(value: Value): Value
```

调用 `structuredClone`；失败时抛 `KeyValueStorageError('CLONE_FAILED', ...)`，错误消息不序列化 Value。

- [ ] **Step 2: 实现页面级 Memory Registry**

在 `memory-registry.ts` 维护模块级：

```ts
type MemoryDatabaseRegistry = Map<string, Map<string, unknown>>
export function getMemoryDatabase(databaseName: string): Map<string, unknown>
```

Registry 按规范化后的 `databaseName` 共享数据库 Map，内部 Key 已含 namespace；Store 实例关闭不清空 Registry。

- [ ] **Step 3: 实现 Memory Store 单 Key 操作**

`MemoryKeyValueStore` 实现 `get/set/has/delete`：

- 每次操作先检查实例未关闭；
- Key 通过 Task 1 工具验证并转换；
- `set` 写入克隆值，`get` 返回新的克隆值；
- `delete` 对不存在 Key 仍成功；
- `state` 固定为 `{ engine: 'memory', persistent: false, fallbackReason }`。

- [ ] **Step 4: 实现 Memory Store 前缀读取**

`keys/entries` 只遍历当前 namespace 前缀，按内部 Key 字符串升序返回。`entries` 的 Value 逐项克隆，返回 Key 移除 namespace 内部前缀。

- [ ] **Step 5: 实现 Memory Store 原子批量操作**

`setMany` 和 `deleteMany` 先验证全部 Key，再复制当前共享 Map 并在副本中完成克隆/写入/删除；全部成功后以副本内容替换共享 Map。空数组是成功的无操作。

- [ ] **Step 6: 实现 Memory Store clear 与 close**

`clear({ prefix })` 仅删除当前 namespace 下匹配前缀的 Key；无参数只清除当前 namespace。`close()` 幂等，只关闭实例句柄和回调引用，不清空共享数据；关闭后的所有异步方法抛 `STORE_CLOSED`。

- [ ] **Step 7: 完整检查 Task 2 触碰文件**

人工检查对象引用隔离、批量回滚、前缀不越界、多实例共享、关闭语义和所有异常转换；确认未创建测试代码。

- [ ] **Step 8: 提交 Task 2**

```bash
git add packages/indexed-db/src/internal/clone.ts packages/indexed-db/src/memory
git commit -m "feat: add memory key value adapter"
```

---

### Task 3: IndexedDB Adapter 与自动降级

**Files:**

- Create: `packages/indexed-db/src/indexed-db/indexed-db-key-value-store.ts`
- Create: `packages/indexed-db/src/create-key-value-store.ts`
- Modify: `packages/indexed-db/src/index.ts`

**Interfaces:**

- Consumes: Task 1 公共协议、Task 2 Memory Adapter、`idb@7.1.1` 的 `openDB`/`IDBPDatabase`。
- Produces: 公共 `createKeyValueStore(options): Promise<KeyValueStore>`。

- [ ] **Step 1: 定义内部 IndexedDB Schema**

在 `indexed-db-key-value-store.ts` 定义内部 `KeyValueDatabaseSchema extends DBSchema`，只含 `entries: { key: string; value: unknown }`；常量固定为 `DATABASE_VERSION = 1`、`STORE_NAME = 'entries'`。

- [ ] **Step 2: 实现连接打开和生命周期回调**

实现内部：

```ts
export interface IndexedDbStoreCallbacks {
  onBlocked(): void
  onTerminated(): void
}

export function openIndexedDbKeyValueStore(
  options: NormalizedCreateKeyValueStoreOptions,
  callbacks: IndexedDbStoreCallbacks,
): Promise<KeyValueStore>
```

`upgrade` 仅在不存在时创建 `entries`；`blocked` 通知 Facade 降级；`blocking` 关闭当前连接；`terminated` 通知 Facade 降级。打开已经被 blocked 判定失效后若连接迟到完成，必须立即关闭，不能泄漏隐藏连接。

- [ ] **Step 3: 实现 IndexedDB 单 Key 操作**

实现 `get/set/has/delete`：使用规范化 namespace 和内部 Key；`has` 使用 `getKey` 而非 Value 是否为 undefined 判断；写入等待对应 Promise 完成；所有异常经 `toKeyValueStorageError` 转换。

- [ ] **Step 4: 实现 IndexedDB 前缀游标**

`keys/entries` 使用 `IDBKeyRange.lowerBound(internalPrefix)` 打开只读游标，按升序遍历；一旦游标 Key 不再 `startsWith(internalPrefix)` 立即停止，避免 `${prefix}\uffff` 上界遗漏高位 Unicode 后缀或越过 namespace。返回前移除 namespace 前缀，Value 使用 IndexedDB 已提供的 structured clone 结果。

- [ ] **Step 5: 实现 IndexedDB 批量原子操作**

`setMany/deleteMany` 在创建 Transaction 前验证全部 Key；在一个 `readwrite` Transaction 内发出全部 put/delete，并等待 `transaction.done`。任一失败由浏览器回滚整批，异常统一转换；空数组直接成功。

- [ ] **Step 6: 实现 IndexedDB clear 与 close**

`clear` 不能调用 Object Store 全量 `clear()`；必须用当前 namespace/prefix 的游标在单个 `readwrite` Transaction 内逐 Key 删除。`close()` 幂等关闭连接；关闭后全部异步方法抛 `STORE_CLOSED`。

- [ ] **Step 7: 实现选择和降级 Facade**

在 `create-key-value-store.ts` 实现：

```ts
export async function createKeyValueStore(
  options: CreateKeyValueStoreOptions,
): Promise<KeyValueStore>
```

Facade 先规范化 `databaseName/namespace`。没有 `globalThis.indexedDB` 时直接返回共享 Memory Store，状态原因是 `INDEXED_DB_UNSUPPORTED`。打开失败映射为实际错误码后返回 Memory Store；blocked/terminated 时关闭旧 Adapter、切换到 Memory Adapter、更新只读状态并只通知一次最新状态。切换后不假装复制 IndexedDB 中的旧数据。

Facade 的 `state` 必须反映当前 Adapter；所有数据方法在调用时读取当前 Adapter，确保 terminated 后的新请求进入 Memory。Facade `close()` 后关闭当前 Adapter，并阻止晚到的 open/terminated 回调重新激活实例。

- [ ] **Step 8: 更新公共入口**

`src/index.ts` 导出：

```ts
export { createKeyValueStore } from './create-key-value-store'
export { KeyValueStorageError } from './errors'
export type {
  CreateKeyValueStoreOptions,
  KeyValueStore,
  StorageEngine,
  StorageErrorCode,
  StorageRuntimeState,
} from './types'
```

不得导出 Adapter class、Registry、内部 Schema、Key/clone 工具或 `idb` 类型。

- [ ] **Step 9: 完整检查 Task 3 触碰文件**

人工检查 blocked/late-open/terminated/close 竞态、namespace 边界、事务完成等待、配额异常不降级、错误信息不泄漏 Value 和公共入口依赖方向；确认未创建测试代码。

- [ ] **Step 10: 提交 Task 3**

```bash
git add packages/indexed-db/src/indexed-db packages/indexed-db/src/create-key-value-store.ts packages/indexed-db/src/index.ts
git commit -m "feat: add indexed db key value adapter"
```

---

### Task 4: 使用说明与非测试验证交付

**Files:**

- Create: `packages/indexed-db/README.md`
- Modify: `docs/superpowers/plans/2026-10-12-indexed-db-key-value-package.md`
- Modify: 仅限 Task 1～3 验证暴露的本批问题文件

**Interfaces:**

- Consumes: Task 1～3 完成的公共 API 和实际验证结果。
- Produces: Package 使用、降级、生命周期说明与可复核的验证记录。

- [ ] **Step 1: 编写 Package README**

README 使用简体中文，至少包含：职责/非职责、安装依赖关系、单值读写、对象和 Blob、prefix 枚举、`setMany/deleteMany`、namespace 隔离、Memory 降级提示、`close()`、GIS/低代码示例、未来后端接口不由本 Package 处理。

- [ ] **Step 2: 检查公开协议与设计一致性**

逐项对照设计文档第 2～12 节，确认公共签名、错误码、Key 语义、降级条件、批量原子性、Memory clone、多实例共享和生命周期均有实现或准确说明；不得用 README 声明未实现能力。

- [ ] **Step 3: 请求非页面验证许可**

向用户询问是否允许 Agent 自动执行：

```bash
pnpm --filter @blog/indexed-db typecheck
pnpm lint
pnpm build:vite
```

用户不允许时不执行，交付中提供命令、预期退出码 0，并明确标记未验证。不得执行任何测试命令或 Webpack 命令。

- [ ] **Step 4: 获准后执行类型检查、Lint 和 Vite 构建**

只在 Step 3 获准后执行。若发现本批引入问题直接修复并重新运行对应检查；若发现非本批既有问题，报告位置、影响和建议，取得确认前不扩大范围。

- [ ] **Step 5: 执行非运行型规则检查**

无需额外许可执行只读检查：

```bash
git diff --check
rg -n "\^|~|latest" packages/indexed-db/package.json
rg --files packages/indexed-db | rg "(^|/)(__tests__|tests?|fixtures?)(/|$)|\.(test|spec)\."
```

Expected：diff 无空白错误；依赖只有精确版本；测试代码扫描没有匹配。检查全部触碰文件完整诊断、公开协议中文注释和依赖方向。

- [ ] **Step 6: 记录实际结果**

在本计划末尾追加：依赖安装是否执行、typecheck/Lint/Vite 是否执行及退出码、测试代码为 0、测试命令未执行、Webpack 未执行、页面验证不适用，以及所有未验证项。

- [ ] **Step 7: 提交文档与最终修正**

```bash
git add packages/indexed-db/README.md packages/indexed-db docs/superpowers/plans/2026-10-12-indexed-db-key-value-package.md pnpm-lock.yaml
git commit -m "docs: document indexed db key value package"
```

提交前核对暂存区，只包含本计划文件；不得纳入用户未跟踪的 GIS 文档。

---

## Final Review Checklist

- [ ] `@blog/indexed-db` 只有通用 Key-Value 语义，没有 Feature 领域类型。
- [ ] `idb` 版本精确固定为 `7.1.1`。
- [ ] databaseName 和 namespace 为空时拒绝；namespace 不允许包含内部分隔符。
- [ ] Caller Key 保留原值但拒绝全空白；内部 Key 不从公共 API 泄漏。
- [ ] IndexedDB 只创建 Version 1 `entries` Store。
- [ ] prefix 游标在离开前缀时停止，不依赖不完整的 Unicode 上界技巧。
- [ ] IndexedDB 批量操作等待 Transaction 完成且失败回滚。
- [ ] Memory 读写均 structured clone，批量操作使用副本提交。
- [ ] 相同 databaseName/namespace 的 Memory 实例共享页面级数据。
- [ ] blocked/terminated 能进入 Memory，并向调用方报告刷新丢失风险。
- [ ] 配额不足、无效 Key、clone 失败和已关闭调用不静默降级。
- [ ] close 幂等，关闭后所有数据方法返回 `STORE_CLOSED`。
- [ ] 公共入口不导出 Adapter、Registry、内部 Schema 或 `idb` 类型。
- [ ] 全部复杂边界和公开协议成员具备准确简体中文注释。
- [ ] 未新增、修改或生成任何测试代码，也未执行测试命令。
- [ ] 未执行页面自动化或 Webpack。
- [ ] 未触碰或提交用户现有的未跟踪 GIS 文档。

