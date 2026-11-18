# A2UI 相关库 API 手册

> 适用分支：`feature/v2-blog-website`
> 版本：`@a2ui/react` 0.15.0、`@a2ui/web_core` 0.15.0、zod 3.25.76、React 19.2.8
> 所有签名取自各包的 `.d.ts` 声明与仓库实现，未做推测。

本手册按「依赖方向」分层列出。读之前先建立这个顺序，否则容易把某一层的 API 错当另一层用：

```
@a2ui/web_core   协议运行时：消息、状态、数据绑定、校验、表达式
      ↑
@a2ui/react      渲染器：把 surface 变成 DOM
      ↑
@white55/a2ui-catalog   契约：Zod schema（只依赖 web_core + zod）
@white55/a2ui-ui        实现：React 组件（只依赖 react + echarts + radix）
      ↑
@white55/a2ui-adapter   适配：把契约翻译成 UI 组件 props（唯一同时依赖以上四者的包）
      ↑
@white55/a2ui           应用：页面、SSE、mock
```

---

# 第一部分：`@a2ui/web_core` 0.15.0

## 1. 包入口一览

| 子路径 | 内容 |
|---|---|
| `@a2ui/web_core` | 全部核心导出（catalog / state / processing / resolution / validation / reactivity / expressions） |
| `@a2ui/web_core/v0_9` | v0.9 协议专用入口：`MessageProcessor`、`Catalog`、`SurfaceModel`、schema、`CommonSchemas` |
| `@a2ui/web_core/v0_9/basic_catalog` | 18 个 basic 组件契约 + 内置函数 + 主题 |
| `@a2ui/web_core/v0_9/universal` | Web Component 实现类型 |
| `@a2ui/web_core/v0_8` / `v1_0` / `catalogs/basic/v1` | 其他协议版本 |

本仓库只使用 `v0_9` 与 `v0_9/basic_catalog`。

## 2. `MessageProcessor` —— 消息处理器

最重要的一类。它接收后端下发的 JSON 消息，维护 surface 集合，向外发出事件。

### 2.1 构造

```ts
new MessageProcessor<T extends ComponentApi = ComponentApi>(
  catalogs: Catalog<any>[],
  actionHandler?: ActionListener,
  options?: MessageProcessorOptions,
): MessageProcessor<T>
```

| 参数 | 类型 | 说明 |
|---|---|---|
| `catalogs` | `Catalog<any>[]` | 可用 catalog，按优先级排列。组件名重复时靠前者胜出 |
| `actionHandler` | `(action: ActionPayload) => void \| Promise<void>` | 全局 action 处理器，所有 surface 的 `event` 型 action 都到这里 |
| `options` | `MessageProcessorOptions` | 见下表 |

**返回值**：`MessageProcessor<T>` 实例。

`MessageProcessorOptions`：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `version` | `ProtocolVersion` | `'v0.9'` | 默认协议版本，用于能力生成与数据模型上报 |
| `adapterRegistry` | `VersionAdapterResolver` | 内置工厂 | 自定义版本适配器 |
| `validationConfig` | `ValidationConfig` | 严格校验 | 校验规则，见 10.2 |
| `outboundListener` | `OutboundMessageListener` | 无 | 接收发往后端的消息（`callAgentFunction` 必需） |
| `errorHandler` | `(error: RendererErrorMessage) => void` | 无 | 结构化错误回调 |
| `reportErrorsOnly` | `boolean` | `false` | `true` 时错误只上报不抛出 |
| `defaultTimeoutMs` | `number` | `30000` | `callAgentFunction` 默认超时 |

**泛型必须显式给出**。`catalogs` 的类型是 `Catalog<any>[]`，无法从实参推断 `T`，不写会退化成 `ComponentApi`，导致 `getSurfaces()` 的返回值传不进 `A2uiSurface`。仓库写法（`a2ui-adapter` 之外的应用层）：

```ts
export const processor = new MessageProcessor<ReactCatalogComponent>(
  [APP_CATALOG],
  (action) => { /* ... */ },
  { reportErrorsOnly: true },
)
```

### 2.2 实例属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `model` | `SurfaceGroupModel<T>` | 底层 surface 容器，含 `onAction` / `onError` 事件源 |
| `rpc` | `RpcHandler` | 双向 RPC 支持 |
| `catalogs` | `Catalog<T>[]` | 构造时传入的 catalog，按优先级 |

### 2.3 消息处理

#### `processMessages(messages, context?)`

同步处理一批消息。**无返回值**，处理结果体现在事件与 surface 状态上。

```ts
processMessages(
  messages: ProcessableMessagePayload,
  context?: ExecutionContext,
): void
```

`ProcessableMessagePayload` 接受四种形态：

| 形态 | 示例 |
|---|---|
| 单条消息 | `{ version: 'v0.9', createSurface: {...} }` |
| 消息数组 | `[msg1, msg2]` |
| 包装对象 | `{ messages: [...] }` |
| 内部操作 | `InternalOperation` |

`ExecutionContext`：

| 字段 | 说明 |
|---|---|
| `isUserActivated` | 是否处于用户手势上下文中（影响需要用户激活的函数） |
| `validationConfig` | 覆盖本次调用的校验规则 |

处理失败时行为取决于 `reportErrorsOnly`：`false`（默认）抛异常，`true` 交给 `errorHandler`。

#### `processMessagesWithErrors(messages, context?)`

与 `processMessages` 相同，但**不抛异常**，把失败的消息变成返回的错误信封。

```ts
processMessagesWithErrors(
  messages: unknown,
  context?: ExecutionContext,
): RendererErrorMessage[]
```

**返回**：`RendererErrorMessage[]`，每条含 `code` / `message` / `surfaceId`，校验失败还带 `path`（JSON Pointer）。无错误时返回空数组。

#### `processMessagesAsync(messages, context?)`

异步处理，会执行 RPC 调用并收集响应。

```ts
processMessagesAsync(
  messages: ProcessableMessagePayload,
  context?: ExecutionContext,
): Promise<RendererFunctionResponseMessage[]>
```

**返回**：本次执行产生的 renderer-to-agent 响应消息数组（`callAgentFunction` 这类双向调用才有内容）。

### 2.4 Surface 查询与订阅

| 方法 | 签名 | 返回 |
|---|---|---|
| `getSurfaces()` | `() => ReadonlyMap<string, SurfaceModel<T>>` | 全部 surface，key 为 `surfaceId` |
| `getSurface(id)` | `(id: string) => SurfaceModel<T> \| undefined` | 单个 surface |
| `onSurfaceCreated(handler)` | `(handler: (surface: SurfaceModel<T>) => void) => Subscription` | 创建事件订阅 |
| `onSurfaceDeleted(handler)` | `(handler: (id: string) => void) => Subscription` | 删除事件订阅，回调收到被删的 id |

`Subscription` 只有一个方法：

```ts
subscription.unsubscribe(): void
```

React 里的标准用法（`useChat`）：

```ts
useEffect(() => {
  const sync = () => setSurfaces([...processor.getSurfaces().values()])
  const created = processor.onSurfaceCreated(sync)
  const deleted = processor.onSurfaceDeleted(sync)
  sync()
  return () => {
    created.unsubscribe()
    deleted.unsubscribe()
  }
}, [])
```

### 2.5 其他方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `dispose()` | `() => void` | 销毁全部 surface，并 reject 挂起的 RPC |
| `getRendererCapabilities(options)` | `(options: CapabilitiesOptions) => RendererCapabilities` | 生成 renderer 能力声明 |
| `getRendererDataModel(version?)` | `(version?: ProtocolVersion) => Record<string, unknown> \| undefined` | 需 `sendDataModel: true` 的 surface 的数据模型快照 |
| `callAgentFunction(surfaceId, call, options?)` | `(…, options?: CallOptions) => Promise<TRes>` | 调用后端函数 |
| `resolvePath(path, contextPath?)` | `(path: string, contextPath?: string) => string` | ⚠️ 已废弃，改用 `DataModel.resolvePath` |
| `getClientCapabilities()` / `getClientDataModel()` | — | ⚠️ 已废弃，改用 `getRenderer*` 版本 |

`getRendererDataModel` 是 action 回传时的关键：它返回**此刻**的数据模型，即用户刚在表单里改过的值，而不是初始值。

## 3. `Catalog` —— 组件与函数注册表

### 3.1 构造

```ts
new Catalog<T extends ComponentApi, F extends FunctionApi = FunctionImplementation>(
  id: string,
  protocolVersion: ProtocolVersion | string,
  components?: ReadonlyArray<T>,
  functions?: ReadonlyArray<F>,
  themeSchemaOrOptions?: z.ZodTypeAny | CatalogOptions,
  instructions?: string,
)
```

| 参数 | 说明 |
|---|---|
| `id` | catalog 唯一标识，通常是 URI。必须与消息里的 `catalogId` 一致 |
| `protocolVersion` | `'0.9'`（注意 v0.9 的 catalog 版本**不带 v 前缀**，而消息里的 `version` 是 `'v0.9'`） |
| `components` | 组件定义数组，内部按 `name` 建 `Map` |
| `functions` | 函数定义数组 |
| `themeSchemaOrOptions` | 主题 Zod schema 或 `CatalogOptions` |
| `instructions` | 给 LLM 的说明文本 |

> ⚠️ v0.9 还有一版**已废弃**的两参数构造：`new Catalog(id, components?, functions?, …)`，会把第二个参数当组件数组并默认 `'0.9'`。不要用。

**组件名重复时 `Map.set` 后写覆盖先写**，且不报错。所以要么用 `derive` / `withEntries`，要么在启动期断言（仓库的做法，见 5.3）。

### 3.2 实例属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | catalog 标识 |
| `protocolVersion` | `ProtocolVersion \| string` | 协议版本 |
| `components` | `ReadonlyMap<string, T>` | 组件注册表，`key` 为组件名 |
| `functions` | `ReadonlyMap<string, F>` | 函数注册表 |
| `themeSchema` | `z.ZodTypeAny \| undefined` | 主题 schema |
| `validationSchema` | `Record<string, unknown>` | 完整 JSON Schema，每次读取返回新副本 |
| `componentRefMap` | `ComponentRefMap` | 子引用关系图，用于拓扑校验 |
| `instructions` / `schemaUri` / `schemaId` / `title` / `description` | 可选 | 文档级元信息 |

### 3.3 方法

| 方法 | 签名 | 返回 | 说明 |
|---|---|---|---|
| `toJson()` | `() => Record<string, unknown>` | catalog 文档 | 序列化为可 `go:embed` 的 JSON |
| `withEntries(components, functions)` | `(T[], F[]) => Catalog<T, F>` | 新 catalog | 换掉全部条目，保留 id / 版本 / 主题 |
| `derive(options)` | `(DeriveCatalogOptions<T, F>) => Catalog<T, F>` | 新 catalog | 按名字挑选或新增条目，**换新 id**，不继承 title / instructions |
| `validationSchema` | getter | `Record<string, unknown>` | 见上 |

`derive` 的 `options`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `catalogId` | `string` | 新 catalog 的 id |
| `components` | `readonly (string \| T)[]` | 字符串表示沿用原名条目；省略则全部沿用 |
| `functions` | `readonly (string \| F)[]` | 同上 |

### 3.4 静态方法

| 方法 | 签名 | 返回 |
|---|---|---|
| `Catalog.fromJson(json, protocolVersion?, catalogId?)` | 从 catalog 文档构造 | `CatalogApi`（`Catalog<ComponentApi, FunctionApi>`，**schema-only**，不含可执行函数） |
| `Catalog.fromSchema(schema, protocolVersion?)` | ⚠️ 已废弃，改用 `fromJson` | 同上 |

`CatalogApi` 只能校验、不能执行函数。渲染器要执行函数必须用带 `FunctionImplementation` 的 catalog。

## 4. `SurfaceModel` —— 单个 surface

由 `MessageProcessor` 创建，应用层只读。

### 4.1 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | surface 标识 |
| `rootId` | `string` | 根组件 id，默认 `'root'` |
| `dataModel` | `DataModel` | 数据模型实例 |
| `componentsModel` | `SurfaceComponentsModel` | 组件模型集合 |
| `defaultCatalog` | `Catalog<T, F> \| undefined` | 默认 catalog |
| `availableCatalogs` | `ReadonlyMap<string, Catalog<T, F>>` | 本 surface 可选的 catalog |
| `protocolVersion` | `string \| undefined` | 协议版本，如 `'v0.9'` |
| `theme` | `any` | 主题配置 |
| `sendDataModel` | `boolean` | 是否随 action 上报完整数据模型 |
| `metadata` | `A2uiMetadata \| undefined` | 元信息信封（可读写） |
| `extensions` | `Extensions \| undefined` | `metadata.extensions` 的快捷视图 |

### 4.2 事件源

| 事件 | 类型 | 触发时机 |
|---|---|---|
| `onAction` | `EventSource<ActionPayload>` | 任何组件派发 action |
| `onError` | `EventSource<A2uiErrorPayload>` | surface 级错误 |
| `onWarning` | `EventSource<A2uiWarningPayload>` | 非致命问题，如绑定了不存在的路径 |
| `onMetadataChanged` | `EventSource<A2uiMetadata \| undefined>` | metadata 变更 |

### 4.3 方法

| 方法 | 签名 | 返回 | 说明 |
|---|---|---|---|
| `dispatchAction(payload, sourceComponentId, metadata?)` | 见签名 | `Promise<void>` | 派发 action；`functionCall` 型在本地执行，不上行 |
| `dispatchError(error)` | `(A2uiErrorPayload) => Promise<void>` | `Promise<void>` | 派发错误 |
| `dispatchWarning(warning)` | `(A2uiWarningPayload) => Promise<void>` | `Promise<void>` | 派发警告 |
| `resolveCatalog(catalogId, subject?)` | — | `Catalog<T, F>` | 解析条目所属 catalog，找不到抛 `A2uiCatalogError` |
| `setExtension(key, value)` / `removeExtension(key)` | — | `void` | 操作 metadata 扩展 |
| `dispose()` | — | `void` | 销毁 surface |

### 4.4 载荷类型

`ActionPayload`（`onAction` 与 `actionHandler` 收到的对象）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | `string` | 动作名，来自 `action.event.name` |
| `surfaceId` | `string` | 来源 surface |
| `sourceComponentId` | `string` | 触发组件 id |
| `timestamp` | `string` | ISO 8601 |
| `context` | `Record<string, unknown>` | `action.event.context` 解析后的键值 |
| `catalogId?` | `string` | 显式声明时的 catalog |
| `userMessage?` / `metadata?` | 可选 | 用户提示与元信息 |

`A2uiErrorPayload`：`code`（字符串）、`message`、可选 `surfaceId` / `expression` / `details`。

`A2uiWarningPayload`：`code`（如 `'MISSING_DATA_BINDING'`）、`message`、可选 `path` / `surfaceId`。

## 5. 契约类型与工厂

### 5.1 `ComponentApi`

任何组件契约的形状：

```ts
interface ComponentApi<Schema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  readonly schema: Schema
  readonly allowedParents?: string[]
  readonly allowedChildren?: string[]
  readonly metadata?: A2uiMetadata
}
```

`schema` **不包含** `id` / `component` 这两个信封字段。

### 5.2 `FunctionApi` / `FunctionImplementation`

```ts
interface FunctionApi {
  readonly name: string
  readonly returnType: A2uiReturnType      // 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any' | 'void'
  readonly schema: z.ZodTypeAny
  readonly allowedCallers?: 'rendererOnly' | 'agentOnly' | 'rendererOrAgent'
  readonly requiresUserActivation?: boolean
  readonly description?: string
}

interface FunctionImplementation extends FunctionApi {
  execute(
    args: Record<string, unknown>,
    context: DataContext,
    abortSignal?: AbortSignal,
  ): unknown | Signal<unknown>
}
```

工厂：

```ts
createFunctionImplementation<Schema, TReturn>(api, execute)
```

**返回**：`FunctionImplementation`（可直接塞进 `Catalog` 的 `functions`）。

### 5.3 命名冲突的启动期断言（仓库做法）

`packages/a2ui-adapter/src/catalog.ts` 采用「只新增、不覆盖」策略，所有自建组件带 `Leo` 前缀：

```ts
export function assertCatalogConsistency(): void {
  for (const component of selfBuilt) {
    if (basicCatalog.components.has(component.name)) {
      throw new Error(`${component.name} 与 basic catalog 重名。本项目只新增、不覆盖…`)
    }
  }
}
```

它**不在模块顶层自动执行**（避免让包被迫依赖 `import.meta.env` 或 `process`），由应用层在 DEV 下调用。加一个新组件时必须同步 `selfBuilt` 数组。

## 6. `DataModel` —— 数据模型

### 6.1 方法

| 方法 | 签名 | 返回 | 说明 |
|---|---|---|---|
| `get<T>(path)` | `(path: string) => T` | 路径上的值 | 不存在返回 `undefined`；禁止 `__proto__` / `constructor` / `prototype` |
| `set(path, value, preserveNull?)` | — | `this` | 写值。`path` 为 `/` 或空则替换根。对象上写 `undefined` 删键；数组上写 `undefined` 保留长度 |
| `delete(path)` | `(path: string) => this` | `this` | 删值；根路径则重置为 `{}` |
| `hasPath(path)` | `(path: string) => boolean` | 路径是否物理存在 | `null` 值算存在 |
| `getSignal<T>(path)` | — | `Signal<T \| undefined>` | 响应式读取 |
| `subscribe<T>(path, onChange)` | — | `DataSubscription<T>` | 订阅变化，返回值带 `.value` 与 `.unsubscribe()` |
| `dispose()` | — | `void` | 清空订阅与信号 |
| `DataModel.resolvePath(path, contextPath?)` | 静态 | `string` | 相对路径转绝对路径 |

### 6.2 常量

| 常量 | 值 | 说明 |
|---|---|---|
| `MAX_ARRAY_INDEX` | `10000` | 数组自动扩容上限，防 OOM |

## 7. `basicCatalog` 与 18 个内置组件

```ts
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog'
```

**类型**：`Catalog<WebComponentImplementation<ZodTypeAny>, FunctionImplementation>`，即组件是 Lit 写的 Web Component，不是 React 组件。

**返回**：带 `components` / `functions` 两个 Map 的 catalog 实例。

### 7.1 全部 18 个组件

导出名与组件名一致（`TextApi.name === 'Text'`）：

| 导出 | 组件名 | 关键字段 |
|---|---|---|
| `TextApi` | `Text` | `text`（必填）、`variant` |
| `ImageApi` | `Image` | `url`（必填）、`description`、`fit`、`variant` |
| `IconApi` | `Icon` | `name`（内置名或 `{ svgPath }`） |
| `VideoApi` | `Video` | `url`（必填） |
| `AudioPlayerApi` | `AudioPlayer` | `url`（必填）、`description` |
| `RowApi` | `Row` | `children`（必填）、`justify`、`align` |
| `ColumnApi` | `Column` | `children`（必填）、`justify`、`align` |
| `ListApi` | `List` | `children`（必填）、`direction`、`align` |
| `CardApi` | `Card` | `child`（必填，单个 id） |
| `TabsApi` | `Tabs` | `tabs: [{ title, child }]` |
| `ModalApi` | `Modal` | `trigger`、`content` |
| `DividerApi` | `Divider` | `axis`：`horizontal` / `vertical` |
| `ButtonApi` | `Button` | `child`、`variant`、`action`（必填）、`checks` |
| `TextFieldApi` | `TextField` | `label`（必填）、`value`、`variant`、`validationRegexp`、`checks` |
| `CheckBoxApi` | `CheckBox` | `label`（必填）、`value`（必填）、`checks` |
| `ChoicePickerApi` | `ChoicePicker` | `options`、`value`、`variant`、`displayStyle`、`filterable` |
| `SliderApi` | `Slider` | `value`（必填）、`max`（必填）、`min`、`label` |
| `DateTimeInputApi` | `DateTimeInput` | `value`、`enableDate`、`enableTime`、`min`、`max` |

另有聚合导出 `BASIC_COMPONENTS`（数组）。

### 7.2 内置函数 15 个

`BASIC_FUNCTION_APIS` 数组，或按下表名字符串在 `{ call: '<name>' }` 中引用。

| 函数 | 参数 | 返回 |
|---|---|---|
| `required` | `value: any` | `boolean` |
| `regex` | `value: DynamicString`、`pattern: string` | `boolean` |
| `length` | `value: DynamicString`、`min?`、`max?`（至少一个） | `boolean` |
| `numeric` | `value: DynamicNumber`、`min?`、`max?` | `boolean` |
| `email` | `value: DynamicString` | `boolean` |
| `formatString` | `value: DynamicString`（支持 `${...}` 插值） | `string` |
| `formatNumber` | `value: DynamicNumber`、`decimals?`、`grouping?` | `string` |
| `formatCurrency` | `value`、`currency`（ISO 4217，必填）、`decimals?`、`grouping?` | `string` |
| `formatDate` | `value`、`format`（Unicode TR35 模式，必填） | `string` |
| `pluralize` | `value: DynamicNumber`、`zero?` / `one?` / `two?` / `few?` / `many?` / `other` | `string` |
| `openUrl` | `url: string` | `void` |
| `and` | `values: DynamicBoolean[]`（≥2） | `boolean` |
| `or` | `values: DynamicBoolean[]`（≥2） | `boolean` |
| `not` | `value: DynamicBoolean` | `boolean` |

### 7.3 主题样式工具

| 导出 | 签名 | 返回 | 说明 |
|---|---|---|---|
| `injectBasicCatalogStyles(targetRoot?)` | `(Document \| ShadowRoot) => void` | `void` | 把 basic catalog 样式以 `adoptedStyleSheets` 注入。Web Component 首次渲染时自动调用 |
| `computeColorVariant('light'\|'dark', options)` | — | `string` | 派生浅色/深色变体 |
| `computeColorVariant('hover', options)` | — | `string` | 派生 hover 色，用 `color-mix(in oklab, …)` |
| `ThemeSchema` | Zod schema | — | 主题参数（`primaryColor` / `iconUrl` / `agentDisplayName`） |

## 8. 校验与表达式

### 8.1 校验

| 导出 | 类型 | 说明 |
|---|---|---|
| `STRICT_VALIDATION` | `ValidationConfig` | 严格校验，默认 |
| `RELAXED_VALIDATION` | `ValidationConfig` | 宽松校验 |
| `validateRecursionAndPaths(data)` | `(data: unknown) => void` | 校验递归深度与路径合法性，失败抛 `A2uiRecursionError` |
| `getComponentReferences(component, catalogOrRefMap)` | — | `Generator<[string, string]>`，产出子引用关系 |
| `MAX_GLOBAL_DEPTH` | `50` | 全局递归深度上限 |
| `MAX_FUNC_CALL_DEPTH` | `5` | 函数调用嵌套上限 |

### 8.2 表达式

`ExpressionParser` 类，位于 `@a2ui/web_core/expressions`。`formatString` 的 `${...}` 插值由它解析，业务代码一般不需要直接用。

## 9. Schema 导出（`@a2ui/web_core/v0_9`）

校验与类型推导用。**这些都是 Zod schema，不是类型**。

### 9.1 消息 schema

| 导出 | 对应消息 |
|---|---|
| `CreateSurfaceMessageSchema` | `{ version, createSurface: { surfaceId, catalogId, theme?, sendDataModel? } }` |
| `UpdateComponentsMessageSchema` | `{ version, updateComponents: { surfaceId, components[] } }` |
| `UpdateDataModelMessageSchema` | `{ version, updateDataModel: { surfaceId, path?, value? } }` |
| `DeleteSurfaceMessageSchema` | `{ version, deleteSurface: { surfaceId } }` |
| `A2uiMessageSchema` | 以上四种的联合 |
| `A2uiMessageListSchema` | 消息数组 |
| `A2uiMessageListWrapperSchema` | `{ messages: [...] }` |

`version` 只能是 `'v0.9'` 或 `'v0.9.1'`。

### 9.2 客户端→服务端 schema

| 导出 | 说明 |
|---|---|
| `A2uiClientActionSchema` | action 上行结构 |
| `A2uiClientErrorSchema` | 错误上行（`A2uiValidationErrorSchema` \| `A2uiGenericErrorSchema`） |
| `A2uiClientMessageSchema` | `{ version, action \| error }` |
| `A2uiClientDataModelSchema` | `{ version, surfaces: Record<surfaceId, dataModel> }` |
| `A2uiClientMessageListSchema` / `…WrapperSchema` | 数组 / 包装形态 |

### 9.3 通用类型 schema

独立导出与聚合导出 `CommonSchemas` 两种方式：

| `CommonSchemas` 键 | 独立导出 | 用途 |
|---|---|---|
| `ComponentId` | `ComponentIdSchema` | 组件 id 字符串 |
| `DataBinding` | `DataBindingSchema` | `{ path: string }` |
| `DynamicValue` | `DynamicValueSchema` | 字面量 / 绑定 / 函数调用 |
| `DynamicString` | `DynamicStringSchema` | 同上，限字符串 |
| `DynamicNumber` | `DynamicNumberSchema` | 同上，限数字 |
| `DynamicBoolean` | `DynamicBooleanSchema` | 同上，限布尔 |
| `DynamicStringList` | `DynamicStringListSchema` | 同上，限字符串数组 |
| `FunctionCall` | `FunctionCallSchema` | `{ call, args?, returnType? }` |
| `ChildList` | `ChildListSchema` | 子组件 id 数组，或模板 `{ componentId, path }` |
| `CheckRule` | `CheckRuleSchema` | `{ condition, message }` |
| `Checkable` | `CheckableSchema` | `{ checks?: CheckRule[] }` |
| `Action` | `ActionSchema` | `{ event }` \| `{ functionCall }` |
| `AccessibilityAttributes` | `AccessibilityAttributesSchema` | `{ label?, description? }` |
| `ComponentCommon` | `ComponentCommonSchema` | `{ id, accessibility? }` |

校验用法：

```ts
import { A2uiMessageSchema } from '@a2ui/web_core/v0_9'

const result = A2uiMessageSchema.safeParse(json)
if (!result.success) console.error(result.error.issues)
```

## 10. 错误类型

全部继承 `A2uiError extends Error`：

| 类 | 何时抛 |
|---|---|
| `A2uiValidationError` | 消息结构校验失败 |
| `A2uiDataError` | 路径非法、越界、含禁止段 |
| `A2uiExpressionError` | 表达式解析或求值失败 |
| `A2uiStateError` | 状态机不合法，如重复 `createSurface` |
| `A2uiCatalogError` | catalog 缺失、条目查不到 |
| `A2uiIntegrityError` | 引用拓扑不完整（继承 `A2uiValidationError`） |
| `A2uiRecursionError` | 递归或嵌套超限（继承 `A2uiValidationError`） |
| `A2uiRpcError` | 双向 RPC 失败 |

## 11. 低层 API（一般不用）

| 类 / 函数 | 用途 |
|---|---|
| `SurfaceGroupModel<T>` | surface 容器，含 `surfacesMap` / `addSurface` / `deleteSurface` / `onSurfaceCreated` |
| `ComponentModel` | 单个组件模型，`onUpdated` 事件源 |
| `ComponentContext` | 渲染时传给组件的上下文，含 `componentModel` / `dataContext` / `dispatchAction` |
| `NodeResolver` | 把组件树解析成节点树，`rootNode: Signal<ComponentNode \| undefined>` |
| `createComponentImplementation` | 见第二部分（由 react 包转出） |
| `signal` / `computed` / `effect` / `batchWrite` / `getValue` / `peekValue` / `isSignal` / `setValue` | 响应式原语 |
| `EventEmitter<T>` | 带 `subscribe` / `emit` 的事件源实现 |

---

# 第二部分：`@a2ui/react` 0.15.0

## 12. 导出总表

| 导出 | 类型 | 说明 |
|---|---|---|
| `A2uiSurface` | React 组件 | 渲染一个 surface |
| `createComponentImplementation` | 工厂函数 | 把 Zod 契约 + React 渲染函数变成 catalog 条目 |
| `createBinderlessComponentImplementation` | 工厂函数 | 自己管理绑定的实现，不经过通用 binder |
| `useA2uiSurface` | Hook | 取当前所在 surface |
| `useNodeView` | Hook | 低层：订阅节点的 props |
| `useSignalValue` | Hook | 订阅 `Signal` 并返回当前值 |
| `useMarkdownRenderer` | Hook | 取 Markdown 渲染器 |
| `MarkdownContext` / `MarkdownComponentContext` | React Context | 自定义 Markdown 渲染 |
| `ReactA2uiComponentProps<T>` | 类型 | 渲染函数收到的参数 |
| `ReactCatalogComponent` | 类型 | catalog 可容纳的条目：React 实现 \| Web Component |
| `ReactComponentImplementation` | 类型 | React 实现 |
| `NodeBuildChild` / `NodeViewProps` / `MarkdownComponentProps` | 类型 | 见下 |

## 13. `A2uiSurface`

```tsx
const A2uiSurface: React.FC<{ surface: SurfaceModel<ReactCatalogComponent> }>
```

| Prop | 类型 | 必需 |
|---|---|---|
| `surface` | `SurfaceModel<ReactCatalogComponent>` | 是 |

**返回值**：`ReactNode`，渲染该 surface 的组件树。

三点使用约束：

1. `surface` 的泛型**必须**是 `ReactCatalogComponent`。传 `SurfaceModel<T>` 的联合类型会因方差报错。
2. 只负责渲染，不负责订阅。surface 变化要由调用方触发重渲染（见 `useChat`）。
3. 每个 surface 一个实例，不要复用同一个 `key`。

## 14. `createComponentImplementation`

```ts
createComponentImplementation<Api extends ComponentApi>(
  api: Api,
  RenderComponent: React.FC<ReactA2uiComponentProps<ResolveA2uiProps<InferredComponentApiSchemaType<Api>>>>,
): ReactComponentImplementation
```

| 参数 | 说明 |
|---|---|
| `api` | 契约对象 `{ name, schema }` |
| `RenderComponent` | 接收已解析 props 的 React 组件 |

**返回**：`ReactComponentImplementation`，可直接放进 `Catalog` 的 `components`。

渲染函数收到的 `ReactA2uiComponentProps<T>`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `props` | `ResolveA2uiProps<…>` | 已解析的属性 |
| `buildChild` | `(id: string, basePath?: string) => ReactNode` | 按组件 id 渲染子树 |
| `context` | `ComponentContext` | 组件上下文 |
| `metadata` | `A2uiMetadata \| undefined` | 元信息 |

### 14.1 `props` 的解析规则

由 `ResolveA2uiProp` 决定，逐项对应 schema：

| schema 类型 | 解析后类型 |
|---|---|
| `DynamicString` / `DynamicNumber` / `DynamicValue` | 绑定值解析后的实际值（`string` / `number` / `unknown`） |
| `Action` | `(options?: ActionDispatchOptions) => Promise<void> \| undefined` |
| `ChildList` | `(string \| ResolvedChildRef)[]` |
| 普通 `z.string()` / `z.number()` | 原样 |
| `CheckRule` / `CheckRule[]` | **原样**，不解析 |

自动附加的字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `set<K>` | `(value) => void` | 每个动态属性生成同名 setter，如 `value` → `setValue` |
| `isValid` | `boolean` | 有 `checks` 时由绑定器求值 |
| `validationErrors` | `string[]` | 失败文案 |
| `validationResults` | `{ valid, message, code?, severity }[]` | 结构化结果 |
| `accessibility` | `{ label?, description?, live?, hidden? }` | 无障碍属性 |

> `setValue` 等 setter 的类型来自 `GenerateSetters`：属性声明为绑定且无字面量分支时，参数类型退化为 `unknown`。

### 14.2 使用示例（仓库实际代码）

```tsx
export const A2uiLeoButton = createComponentImplementation(LeoButtonApi, ({ props, buildChild }) => (
  <LeoButton
    variant={props.variant ?? 'default'}
    size={props.size ?? 'md'}
    onClick={() => void props.action?.()}
  >
    {props.child ? buildChild(props.child) : null}
  </LeoButton>
))
```

`props.action` 是 `Action` 解析来的可调用函数，但类型上带 `| undefined`，所以要 `?.()`；`void` 是为了显式丢弃返回的 Promise。

## 15. 其他 Hook

| Hook | 签名 | 返回 |
|---|---|---|
| `useA2uiSurface()` | `() => SurfaceModel<ReactCatalogComponent> \| undefined` | 当前 surface，不在 `A2uiSurface` 内时为 `undefined` |
| `useSignalValue(signal)` | `<T>(Signal<T>) => T` | 当前值，变化自动重渲染 |
| `useNodeView(node, buildChild)` | 见下 | 节点视图上下文 |

`useNodeView` 返回：

| 字段 | 类型 |
|---|---|
| `viewProps` | `NodeProps` |
| `metadata` / `metadataSnapshot` | `A2uiMetadata \| undefined` |
| `hasReadMetadata` | `() => boolean` |
| `context` | `ComponentContext` |
| `viewBuildChild` / `rawBuildChild` | `(id: string, basePath?: string) => ReactNode` |

## 16. `createBinderlessComponentImplementation`

```ts
createBinderlessComponentImplementation(
  api: ComponentApi,
  RenderComponent: React.FC<ReactRenderProps>,
): ReactComponentImplementation
```

与 `createComponentImplementation` 的区别：**不自动解析 props**，渲染函数收到的是 `{ context, buildChild, metadata? }`，字段要自己从 `context` 里读。仅在需要完全控制订阅行为时使用，本仓库未使用。

## 17. Markdown 渲染

| 导出 | 类型 | 用途 |
|---|---|---|
| `MarkdownContext` | `React.Context<MarkdownRenderer \| undefined>` | 提供返回 HTML 的函数 |
| `MarkdownComponentContext` | `React.Context<ComponentType<MarkdownComponentProps> \| undefined>` | 提供 React 组件，优先级高于前者 |
| `useMarkdownRenderer()` | Hook | 取当前渲染器 |
| `MarkdownComponentProps` | 类型 | `{ markdown: string }` |

> 两个 Context 都作用于**整页**：要么每个 `A2uiSurface` 都给，要么都不给。只给一部分会出现某些 surface 的 Markdown 文本不显示。

---

# 第三部分：`@white55/a2ui-catalog`

只含 Zod schema，不依赖 React。

## 18. 导出总表

```ts
import * as CatalogPkg from '@white55/a2ui-catalog'
```

| 导出 | 类型 | 说明 |
|---|---|---|
| `LeoTextApi` | `{ name: 'LeoText', schema }` | 文本 |
| `TEXT_VARIANTS` | `readonly ['h1','h2','h3','h4','h5','body','caption']` | 变体枚举 |
| `TextVariantName` | 类型 | 变体联合类型 |
| `LeoButtonApi` | 契约 | 按钮 |
| `BUTTON_VARIANTS` | `readonly ['default','primary','outline','borderless']` | 变体 |
| `BUTTON_SIZES` | `readonly ['md','sm']` | 尺寸 |
| `ButtonVariantName` | 类型 | — |
| `LeoCardApi` / `CARD_TONES` | 契约 / `readonly ['default','warning','danger','brand']` | 卡片 |
| `LeoTextFieldApi` / `LEO_TEXT_FIELD_VARIANTS` | 契约 / `readonly ['text','textarea']` | 输入框 |
| `LeoCheckBoxApi` | 契约 | 勾选框 |
| `LeoTabsApi` / `TABS_VARIANTS` | 契约 / `readonly ['line','pill']` | 标签页 |
| `LeoModalApi` | 契约 | 弹窗 |
| `LeoBadgeApi` / `LEO_BADGE_TONES` | 契约 / 6 个语义色 | 徽标 |
| `LeoStatCardApi` | 契约 | 指标卡 |
| `LeoLinkButtonApi` | 契约 | 链接按钮 |
| `LeoChartApi` / `CHART_KINDS` | 契约 / `readonly ['bar','hbar','line','area']` | 图表 |
| `LeoOrderCardApi` | 契约 | 订单卡 |

所有 `*Api` 的形状统一为 `{ name: string, schema: z.ZodObject<…> }`，可直接传给 `createComponentImplementation`。

## 19. 各组件字段

### 19.1 `LeoText`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `text` | `DynamicString` | 必填 | 内容 |
| `variant` | `'h1'…'h5' \| 'body' \| 'caption'` | `'body'` | 视觉层级 |
| `markdown` | `boolean` | `false` | 是否按 Markdown 渲染。默认关闭，避免 `A * B` 被误渲染 |
| `accessibility` | `AccessibilityAttributes` | — | — |

### 19.2 `LeoButton`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `variant` | `'default' \| 'primary' \| 'outline' \| 'borderless'` | `'default'` | 注意与组件库的 `BUTTON_VARIANTS`（5 个，含 `dark`）**不同** |
| `size` | `'md' \| 'sm'` | `'md'` | — |
| `child` | `ComponentId` | — | 通常指向一个 `LeoText` |
| `action` | `Action` | — | 点击回传 |
| `accessibility` | `AccessibilityAttributes` | — | — |

### 19.3 `LeoCard`

| 字段 | 类型 | 默认 |
|---|---|---|
| `child` | `ComponentId` | — |
| `tone` | `'default' \| 'warning' \| 'danger' \| 'brand'` | `'default'` |
| `accessibility` | — | — |

### 19.4 `LeoTextField`

| 字段 | 类型 | 默认 |
|---|---|---|
| `label` | `DynamicString` | — |
| `value` | `DynamicString` | **必填** |
| `variant` | `'text' \| 'textarea'` | `'text'` |
| `validationRegexp` | `string` | — |
| `checks` | `{ condition, message }[]` | — |
| `accessibility` | — | — |

`checks[].condition` 可为 `boolean`、`{ path }` 或函数调用，三者都在前端求值。

### 19.5 `LeoCheckBox`

| 字段 | 类型 | 默认 |
|---|---|---|
| `label` | `DynamicString` | — |
| `value` | `DynamicBoolean` | **必填** |
| `indeterminate` | `DynamicBoolean` | — |
| `accessibility` | — | — |

### 19.6 `LeoTabs`

| 字段 | 类型 | 默认 |
|---|---|---|
| `variant` | `'line' \| 'pill'` | `'line'` |
| `tabs` | `{ title: DynamicString, child: ComponentId }[]`（≥1） | 必填 |
| `accessibility` | — | — |

### 19.7 `LeoModal`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `label` | `DynamicString` | `'打开'` | 触发按钮文字 |
| `title` | `DynamicString` | `'详情'` | 弹窗标题 |
| `content` | `ComponentId` | 必填 | 正文 |
| `accessibility` | — | — | — |

**没有 `trigger`**。basic catalog 的 `Modal` 用 `trigger` 指向触发组件，但渲染器的 `buildChild` 无法给子节点注入 `onClick`，实现不了；改为自己渲染入口按钮。

### 19.8 `LeoBadge`

| 字段 | 类型 | 默认 |
|---|---|---|
| `text` | `DynamicString` | 必填 |
| `tone` | `'neutral' \| 'warning' \| 'danger' \| 'success' \| 'brand' \| 'outline'` | `'neutral'` |
| `dashed` | `boolean` | `false` |
| `accessibility` | — | — |

### 19.9 `LeoStatCard`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `label` | `DynamicString` | 必填 | 指标名 |
| `value` | `DynamicString` | 必填 | **字符串而非数字**：千分位、单位由后端格式化 |
| `caption` | `DynamicString` | — | 补充说明 |
| `highlight` | `boolean` | `false` | 高亮描边 |
| `accessibility` | — | — | — |

### 19.10 `LeoLinkButton`

| 字段 | 类型 | 默认 |
|---|---|---|
| `text` | `DynamicString` | 必填 |
| `action` | `Action` | — |
| `arrow` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| `accessibility` | — | — |

### 19.11 `LeoChart`

| 字段 | 类型 | 默认 |
|---|---|---|
| `kind` | `'bar' \| 'hbar' \| 'line' \| 'area'` | 必填 |
| `data` | `DynamicValue` | 必填 |
| `xField` | `string` | 必填 |
| `series` | `{ field, label: DynamicString, color? }[]`（≥1） | 必填 |
| `height` | `number` | `240` |
| `showLegend` | `boolean` | `true` |
| `showValueLabel` | `boolean` | `false` |
| `optimize` | `'none' \| 'large' \| 'sampling'` | `'none'` |

### 19.12 `LeoOrderCard`

| 字段 | 类型 |
|---|---|
| `orderNo` | `DynamicString`（必填） |
| `amount` | `DynamicNumber`（必填） |
| `onView` | `Action`（必填） |
| `checks` | `CheckRule[]` |

## 20. 产物脚本

```bash
pnpm --filter @white55/a2ui-catalog build
```

脚本 `scripts/export.ts` 合并 `basicCatalog` 与全部自研契约，输出：

| 文件 | 内容 |
|---|---|
| `dist/catalog.json` | `Catalog.toJson()` 的完整文档，可直接给后端 `go:embed` |
| `dist/VERSION` | `{ version, hash, protocolVersion, generatedFrom }` |

---

# 第四部分：`@white55/a2ui-ui`

纯 React 组件，不认识 A2UI。所有组件都导出同名 props 类型。

## 21. 导出总表

| 导出 | 类型 | Props 类型 |
|---|---|---|
| `LeoButton` / `BUTTON_VARIANTS` | 组件 / 常量 | `LeoButtonProps`、`ButtonVariant` |
| `LeoText` | 组件 | `LeoTextProps`、`TextViewVariant` |
| `LeoCard` | 组件 | `LeoCardProps` |
| `LeoBadge` / `BADGE_TONES` | 组件 / 常量 | `LeoBadgeProps`、`BadgeTone` |
| `LeoStatCard` | 组件 | `LeoStatCardProps` |
| `LeoLinkButton` | 组件 | `LeoLinkButtonProps` |
| `LeoTextField` | 组件 | `LeoTextFieldProps` |
| `LeoCheckBox` | 组件 | `LeoCheckBoxProps` |
| `LeoTabs` / `LeoTabItem` | 组件 / 类型 | `LeoTabsProps` |
| `LeoModal` | 组件 | `LeoModalProps` |
| `LeoChart` / `CHART_KINDS` | 组件 / 常量 | `LeoChartProps`、`ChartKind`、`ChartSeries` |

另有样式入口 `@white55/a2ui-ui/tokens.css`。

> 注意：`CARD_BORDER_TONES` 与 `CardBorderTone` 在 `LeoCard.tsx` 里声明，但**未从 `src/index.ts` 导出**，包外不可见。需要 `CardBorderTone` 时用 `LeoCardProps['borderColor']`。

## 22. 组件 Props 与返回值

所有组件都是普通函数组件，**返回 `ReactNode`**，无副作用、无受控状态（除 `LeoTabs` 内部维护当前 tab）。

### 22.1 `LeoButton`

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `variant` | `'dark' \| 'primary' \| 'default' \| 'outline' \| 'borderless'` | `'default'` | 5 个变体 |
| `size` | `'sm' \| 'md'` | `'md'` | — |
| `disabled` | `boolean` | — | — |
| `onClick` | `() => void` | — | — |
| `children` | `ReactNode` | **必填** | — |

返回：`<button type="button" class="leo-btn leo-btn--{variant} leo-btn--{size}">`。

> ⚠️ 契约层 `LeoButtonApi` 只开放 4 个变体（无 `dark`），因为 `dark` 被视作主题层面的深浅，不该由后端下发。适配器直接透传，所以协议侧永远拿不到 `dark`。

### 22.2 `LeoText`

| Prop | 类型 | 默认 |
|---|---|---|
| `variant` | `'body' \| 'caption' \| 'h1'…'h5'` | `'body'` |
| `children` | `ReactNode` | 必填 |

返回：`h1`…`h5` 渲染为对应语义标签，`body` / `caption` 渲染为 `<span>`。**不处理 Markdown**：契约层的 `markdown` 字段目前没有实现层消费方，传 `true` 不会有任何效果。

### 22.3 `LeoCard`

| Prop | 类型 | 默认 |
|---|---|---|
| `children` | `ReactNode` | — |
| `borderColor` | `'default' \| 'warning' \| 'danger' \| 'brand'` | `'default'` |

返回：`<div class="leo-card leo-card--border-{tone}">`。

### 22.4 `LeoBadge`

| Prop | 类型 | 默认 |
|---|---|---|
| `children` | `ReactNode` | 必填 |
| `tone` | `'neutral' \| 'warning' \| 'danger' \| 'success' \| 'brand' \| 'outline'` | `'neutral'` |
| `dashed` | `boolean` | `false` |

返回：`<span class="leo-badge leo-badge--{tone}[ leo-badge--dashed]">`。

### 22.5 `LeoStatCard`

| Prop | 类型 | 默认 |
|---|---|---|
| `label` | `string` | 必填 |
| `value` | `string` | 必填 |
| `caption` | `ReactNode` | — |
| `highlight` | `boolean` | `false` |

返回：三到四层 `<span>`。数值用 `tabular-nums` 对齐小数点。

### 22.6 `LeoLinkButton`

| Prop | 类型 | 默认 |
|---|---|---|
| `children` | `ReactNode` | 必填 |
| `onClick` | `() => void` | — |
| `arrow` | `boolean` | `false` |
| `disabled` | `boolean` | — |

返回：`<button class="leo-link-btn">`，`arrow` 为真时追加 `→`。

### 22.7 `LeoTextField`

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `label` | `string` | — | — |
| `value` | `string` | `''` | 受控值 |
| `placeholder` | `string` | — | — |
| `disabled` | `boolean` | — | — |
| `invalid` | `boolean` | — | 为真时加红边并设 `aria-invalid` |
| `onChange` | `(value: string) => void` | — | **直接回传字符串**，不是事件对象 |

返回：`<div class="leo-field">` + `<label>`（可选）+ `<input type="text">`。

### 22.8 `LeoCheckBox`

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `label` | `string` | — | — |
| `checked` | `boolean` | — | 传 `undefined` 表示非受控 |
| `indeterminate` | `boolean` | `false` | 半选态，`aria-checked="mixed"` |
| `disabled` | `boolean` | — | — |
| `onChange` | `(checked: boolean) => void` | — | — |

基于 `@radix-ui/react-checkbox`。返回：Radix `Root` + `Indicator`（内含勾/横线 SVG）+ 可选 `<label>`。

### 22.9 `LeoTabs`

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `items` | `LeoTabItem[]` | 必填 | 见下 |
| `value` | `string` | — | 受控当前 tab；不传则非受控 |
| `onChange` | `(value: string) => void` | — | — |

```ts
interface LeoTabItem {
  title: string
  value?: string        // 不传时按索引生成
  content: React.ReactNode
}
```

基于 `@radix-ui/react-tabs`。返回：`Tabs.Root`（`List` + 多个 `Trigger`）+ 多个 `Tabs.Content`。

### 22.10 `LeoModal`

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `open` | `boolean` | 必填 | 受控 |
| `onOpenChange` | `(open: boolean) => void` | 必填 | — |
| `title` | `string` | 必填 | — |
| `children` | `ReactNode` | 必填 | 正文 |
| `closeLabel` | `string` | `'关闭'` | 关闭按钮的无障碍名 |

基于 `@radix-ui/react-dialog`。返回：`Dialog.Root` + `Portal`（`Overlay` + `Content`）。焦点陷阱、Esc、点遮罩关闭、滚动锁定都由 Radix 提供。

### 22.11 `LeoChart`

| Prop | 类型 | 默认 |
|---|---|---|
| `kind` | `'bar' \| 'hbar' \| 'line' \| 'area'` | 必填 |
| `data` | `Record<string, unknown>[]` | 必填 |
| `xField` | `string` | 必填 |
| `series` | `ChartSeries[]` | 必填 |
| `height` | `number` | `240` |
| `showLegend` | `boolean` | `true` |
| `showValueLabel` | `boolean` | `false` |
| `optimize` | `'none' \| 'large' \| 'sampling'` | `'none'` |

```ts
interface ChartSeries {
  field: string
  label: string
  color?: string
}
```

返回：`<div style="width:100%; height:{height}">`，ECharts 实例挂在其上。

三个必须保留的内部行为：

1. `echarts.init` 只在挂载时执行一次，卸载时 `dispose()`；
2. `ResizeObserver` 监听尺寸，`clientWidth > 0` 时才 `resize()`（隐藏容器初始化会得到空白图）；
3. `MutationObserver` 监听 `document.documentElement` 的 `data-theme`，主题切换后重设 option（canvas 不会自动重绘）。

颜色从 CSS 变量读：`--a2ui-color-on-surface`、`--a2ui-color-border`、`--a2ui-color-primary`。

ECharts 注册在 `chart/echarts-registry.ts`，只 `use` 了 `BarChart` / `LineChart` / `GridComponent` / `LegendComponent` / `TooltipComponent` / `CanvasRenderer`。新增图表类型（如饼图）必须先在这里注册。

## 23. 设计 Token

`tokens.css` 提供两层变量：

| 前缀 | 用途 |
|---|---|
| `--leo-*` | 品牌层：`brand` / `bg` / `text` / `border` / `radius` / `font` / `space-1…4` |
| `--a2ui-*` | 映射层：把品牌值映射给 basic catalog 的 Web Component |

主题切换：`document.documentElement.dataset.theme = 'dark'`。`tokens.css` 里 `[data-theme='dark']` 覆盖 `--leo-*` 值，`--a2ui-*` 因为引用 `var(--leo-*)` 而自动跟随。

派生色 `--a2ui-color-primary-hover` 必须用 `color-mix(in oklab, … 85%, black)`，与 `@a2ui/web_core` 的算法一致，否则两侧同名按钮 hover 色不同。

---

# 第五部分：`@white55/a2ui-adapter`

## 24. 导出总表

| 导出 | 类型 | 说明 |
|---|---|---|
| `A2uiSurface` / `createComponentImplementation` | 转发自 `@a2ui/react/v0_9` | — |
| `MessageProcessor` / `Catalog` / `CommonSchemas` | 转发自 `@a2ui/web_core/v0_9` | — |
| `ActionPayload` / `ComponentApi` / `A2uiMessage` / `ProcessableMessagePayload` / `SurfaceModel` / `ReactA2uiComponentProps` / `ReactCatalogComponent` | 类型 | — |
| `basicCatalog` / `TextApi` / `ButtonApi` / `CardApi` / `TextFieldApi` / `CheckBoxApi` / `TabsApi` / `ModalApi` | 转发自 basic_catalog | — |
| `CATALOG_ID` | `'https://leo.example/a2ui/catalog'` | — |
| `APP_CATALOG` | `Catalog<ReactCatalogComponent>` | basic 全部组件 + 12 个自研组件的合并结果 |
| `assertCatalogConsistency()` | `() => void` | 重名断言，重名则抛错 |
| `A2uiLeoText` … `A2uiLeoLinkButton` | 12 个 `ReactComponentImplementation` | 适配器产物 |

### 24.1 `APP_CATALOG` 的构成

```ts
new Catalog<ReactCatalogComponent>(
  CATALOG_ID,
  '0.9',
  [...basicCatalog.components.values(), ...selfBuilt],
  [...basicCatalog.functions.values()],
)
```

**basic 组件全部原样保留**，12 个自研组件以 `Leo` 前缀并存，不覆盖任何标准组件。这与早期「覆盖 basic」的方案不同——「只新增、不覆盖」让 basic 的标准组件仍可被后端使用，也让契约层可以自由命名。

### 24.2 适配器一览

| 导出 | 契约 | 渲染的 UI 组件 | 关键转换 |
|---|---|---|---|
| `A2uiLeoText` | `LeoTextApi` | `LeoText` | `variant` 直接透传 |
| `A2uiLeoButton` | `LeoButtonApi` | `LeoButton` | `action` → `onClick`；`child` → `buildChild` |
| `A2uiLeoCard` | `LeoCardApi` | `LeoCard` | `tone` → `borderColor`（`'default'` 转 `undefined`） |
| `A2uiLeoTextField` | `LeoTextFieldApi` | `LeoTextField` | `validationRegexp` + `checks` 求值 → `invalid`；`setValue` → `onChange` |
| `A2uiLeoCheckBox` | `LeoCheckBoxApi` | `LeoCheckBox` | `value` → `checked`；`setValue` → `onChange` |
| `A2uiLeoTabs` | `LeoTabsApi` | `LeoTabs` | `tabs: [{title, child}]` → `items: [{title, content}]` |
| `A2uiLeoModal` | `LeoModalApi` | `LeoButton` + `LeoModal` | 自己维护 `open` 状态，`content` → `buildChild` |
| `A2uiLeoBadge` | `LeoBadgeApi` | `LeoBadge` | `text` → `children` |
| `A2uiLeoStatCard` | `LeoStatCardApi` | `LeoStatCard` | 全部字段直传 |
| `A2uiLeoLinkButton` | `LeoLinkButtonApi` | `LeoLinkButton` | `text` → `children`；`action` → `onClick` |
| `A2uiLeoChart` | `LeoChartApi` | `LeoChart` | `data` 收窄为数组；`series[].label` 的 `undefined` 退化为 `''` |
| `A2uiLeoOrderCard` | `LeoOrderCardApi` | `LeoCard` + `LeoText` + `LeoButton` | 组合渲染 |

所有适配器都是 `createComponentImplementation(api, …)` 的一行式产物，只做字段翻译，不写样式。

---

# 第六部分：`@white55/a2ui`（应用层）

## 25. 内部模块

| 模块 | 导出 | 说明 |
|---|---|---|
| `src/a2ui/protocol.ts` | 全部 re-export 自 `@white55/a2ui-adapter` | 应用侧唯一协议入口 |
| `src/a2ui/catalog-meta.ts` | `CATALOG_ID`、`CATALOG_VERSION` | 纯字符串，供 Node 侧 mock 使用 |
| `src/a2ui/processor.ts` | `processor: MessageProcessor<ReactCatalogComponent>` | 单例 |
| `src/a2ui/navigation.ts` | `NAVIGATE_ACTION`、`setNavigate`、`navigateTo` | action → 路由跳转的桥 |
| `src/chat/useChat.ts` | `useChat()`、`ChatMessage` | SSE 消费 + surface 订阅 |
| `src/chat/useTheme.ts` | `useTheme()`、`Theme` | 主题与 URL 同步 |
| `src/chat/nav.ts` | `NavItem`、`NavGroup`、`NAV_GROUPS`、`PATH_LABEL`、`CONTENT_TABS` | 导航数据 |
| `src/app/AppShell.tsx` | `AppShell` | 四段式页面骨架 |
| `src/chat/*.tsx` | `ChatPage`、`Sidebar`、`MessageList`、`ChatInput`、`ChatDock`、`LibraryDemo`、`BuiltinDemo` | 页面组件 |
| `src/mock/fixtures.ts` | `messagesForRequest(index)`、`COMPLEX_SURFACE_ID` | 三阶段消息（默认 → 增量 → 清空） |
| `src/mock/middleware.ts` | `mockApiPlugin()` | dev 专用 Vite 插件 |

### 25.1 `processor`

```ts
new MessageProcessor<ReactCatalogComponent>(
  [APP_CATALOG],
  (action: ActionPayload) => { /* 见下 */ },
  { reportErrorsOnly: true },
)
```

action 处理器有两个分支：

1. **`action.name === 'navigate'`**：取 `action.context.to`，本地调用 `navigateTo(to)`，成功则**不上行**；失败则继续走默认上行。
2. **其他动作**：把 `action` 与 `processor.getRendererDataModel()` 合并后 `POST /api/action`。

为什么带上 `dataModel`：`action.context` 只有组件自己声明的静态参数，页面上用户刚改过的值不在里面，必须单独带上。

### 25.2 `useChat()`

| 返回字段 | 类型 | 说明 |
|---|---|---|
| `messages` | `ChatMessage[]` | `{ id, role: 'user' \| 'assistant', text }` |
| `surfaces` | `SurfaceModel<ReactCatalogComponent>[]` | 当前全部 surface |
| `send` | `(text: string) => Promise<void>` | 发送并消费 SSE |
| `sending` | `boolean` | 请求进行中 |

`send` 发给 mock 的 body 是 `{ message, hasSurface }`。`hasSurface` 让 mock 知道前端是否还持有 surface：刷新后前端内存清空，mock 据此从头重发 `createSurface`，否则会接着上一轮计数只发增量，页面永远停在「等待生成…」。

### 25.3 `useTheme()`

| 返回字段 | 类型 | 说明 |
|---|---|---|
| `theme` | `'light' \| 'dark'` | 来自 `?theme=dark` |
| `toggleTheme` | `() => void` | 切换并写回 URL（`replace: true`，不堆历史记录） |

主题写在 `<html data-theme>` 上：悬浮面板是 `position: fixed`，只有挂在 html 上才能和 A2UI 的 Web Component 读到同一套变量。

### 25.4 `navigation.ts`

| 导出 | 签名 | 返回 | 说明 |
|---|---|---|---|
| `NAVIGATE_ACTION` | `'navigate'` | 常量 | 约定的跳转动作名 |
| `setNavigate(fn)` | `(fn: (to: string) => void) => () => void` | 清理函数 | 由 `ChatPage` 挂载时注入 |
| `navigateTo(to)` | `(to: string) => boolean` | 是否成功 | 未注入时返回 `false` |

这是一个**模块级函数槽位**而不是事件总线：只有一个生产者（React）和一个消费者（processor），槽位少一层间接。清理函数只在槽位仍是自己注入的那个时才清空，避免重建时序把新函数误清。

### 25.5 `mockApiPlugin()`

```ts
mockApiPlugin(): Plugin  // apply: 'serve'
```

挂载两个中间件：

| 路径 | 行为 |
|---|---|
| `POST /api/chat` | 读 body 的 `hasSurface`；`false` 时重置计数。按 `requestCount % 3` 选批次，逐条 SSE 下发（间隔 80ms），结束发 `data: [DONE]` |
| `POST /api/action` | 打印 body，返回 `204` |

响应头：`Content-Type: text/event-stream`、`X-A2UI-Version`（= `CATALOG_VERSION`）、`X-A2UI-Hash: dev`。

三阶段消息（`messagesForRequest`）：

| 阶段 | 批次 | 内容 |
|---|---|---|
| 0 | `defaultBatch` | `createSurface`（带 `sendDataModel: true`）+ 完整组件树 + 初始数据 |
| 1 | `updateBatch` | 只发改动部分，验证增量更新 |
| 2 | `clearMessages` | `deleteSurface`，验证清空 |

`requestCount` 在模块作用域，整个 dev server 进程内累加，重启归零。

### 25.6 页面路由

`main.tsx` 用 `BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}`，即 `/a2ui`（**不带尾部斜杠**，否则路径会出现 `//`）。

| 路由 | 内容 |
|---|---|
| `/library` | `LibraryDemo`：直接写 JSX 使用 `a2ui-ui`，不经 A2UI |
| `/builtin` | `BuiltinDemo`：只注册 `basicCatalog` 的独立 `MessageProcessor`，展示 A2UI 自带组件 |
| `/integrated` | 渲染 `processor` 里的 surface，即 `Leo*` 自研组件 |
| `/protocol/*` | 占位页，靠右侧对话面板演示协议能力 |
| `/` 与未知路径 | 重定向到 `/library` |

URL 参数：`?theme=dark`、`?fullscreen=1`、`?nav=collapsed`、`?dock=closed`。

### 25.7 `BuiltinDemo` 中的独立 processor

```tsx
const p = new MessageProcessor<ReactCatalogComponent>([basicCatalog as never], undefined, {
  reportErrorsOnly: true,
})
p.processMessages(builtinMessages)
```

`basicCatalog` 的组件类型是 `WebComponentImplementation`，与 `ReactCatalogComponent` 不完全对齐，故用 `as never` 收窄。这是**唯一**允许这样写的地方，因为它只用于展示、不参与主链路。新代码不要模仿。

---

## 附录 A：常见类型速查

| 类型 | 来源 | 形状 |
|---|---|---|
| `A2uiMessage` | `web_core/v0_9` | 四种消息的联合 |
| `ActionPayload` | `web_core/v0_9` | `{ name, surfaceId, sourceComponentId, timestamp, context, … }` |
| `SurfaceModel<T>` | `web_core/v0_9` | 见 4.1 |
| `ReactCatalogComponent` | `react/v0_9` | `ReactComponentImplementation \| WebComponentImplementation` |
| `ReactA2uiComponentProps<T>` | `react/v0_9` | `{ props, buildChild, context, metadata? }` |
| `ComponentApi` | `web_core/v0_9` | `{ name, schema, allowedParents?, allowedChildren?, metadata? }` |
| `Subscription` | `web_core` | `{ unsubscribe(): void }` |
| `EventSource<T>` | `web_core` | `{ subscribe(listener): Subscription }` |
| `ProcessableMessagePayload` | `web_core/v0_9` | 单条 \| 数组 \| 包装对象 \| `InternalOperation` |

## 附录 B：API 使用边界

| 规则 | 原因 |
|---|---|
| 应用层只能从 `a2ui/protocol.ts` 引入 `@a2ui/*` | 换渲染器或升协议时改动收敛在一处 |
| `a2ui-ui` 禁止 import `@a2ui/*` | 保持组件库与协议解耦，可被非 A2UI 页面复用 |
| `a2ui-catalog` 禁止 import React / UI 库 | 契约要能被后端与其它端消费 |
| 适配器禁止写样式、禁止 import `echarts` / `@radix-ui/*` | 视觉与第三方依赖只在实现层 |
| `processor` 的泛型必须显式写 `ReactCatalogComponent` | 否则 `getSurfaces()` 的类型传不进 `A2uiSurface` |
| `A2uiSurface` 的 `surface` 泛型只能是 `ReactCatalogComponent` | `SurfaceModel` 含入参位置，联合类型不兼容 |
| 新增自研组件必须用 `Leo` 前缀并更新 `selfBuilt` | 避免 `Map.set` 静默覆盖 basic 组件 |
| 必须同步更新 `mock/fixtures.ts` 才能看到效果 | mock 固定返回 `defaultBatch` 里列出的组件 |
