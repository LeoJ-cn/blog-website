# A2UI 测试应用实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `packages/` 下新建三个 workspace 包，实现 `/a2ui` 子路径上的 A2UI 渲染测试应用，用本地 SSE 假后端跑通「协议定义 → JSON 消息 → 渲染 → action 回传」完整闭环。

**Architecture:** 我方四层分离 —— 契约层（`a2ui-catalog`，纯 Zod）、实现层（`a2ui-ui`，唯一视觉与第三方库入口）、适配层（`a2ui` 内的字段翻译）、应用层（路由与 SSE）。适配层产物交给第三方运行时：`@a2ui/web_core` 的 `MessageProcessor` 与 `@a2ui/react` 的 `A2uiSurface`。依赖严格单向，契约层与实现层互不依赖，两个 `@a2ui/*` 包只被应用包直接依赖。

**Tech Stack:** React 19.2.8、Vite 6.0.11、TypeScript 5.6.3、`@a2ui/react` 0.15.0、`@a2ui/web_core` 0.15.0、zod 3.25.76、Radix UI、ECharts 6.1.0

**Spec:** `docs/superpowers/specs/2026-11-17-a2ui-test-app-design.md`

## Global Constraints

- 所有依赖使用精确版本，禁止 `^` / `~` / `*` / `latest`
- Vite 版本必须为 `6.0.11`（`pnpm check:vite` 会校验）
- React / React DOM / `@types/react` 为 `19.2.8`；`@types/react-dom` 为 `19.2.7`
- `.npmrc` 为 `auto-install-peers=false` + `strict-peer-dependencies=true`，所有 peer 必须显式声明
- 仓库自有前端样式禁用 CSS Grid，布局一律 Flexbox
- 默认只运行 Vite；禁止未经授权执行任何 Webpack 命令
- 本批**不新增测试代码**（未收到 `允许添加测试代码` 口令）；验证只用 `pnpm typecheck`、`pnpm lint`、`pnpm build:a2ui`
- 仓库自有代码注释使用简体中文，只解释「为什么」，不复述代码行为
- 提交信息遵循 Conventional Commits

## Review Focus

1. **`display: contents` 包裹层破坏后代选择器** —— basic 组件与自建组件都会被包进 `<a2ui-react-*>`，依赖父级的样式在右侧失效；样式必须只挂组件自身 class。
2. **ECharts 在宽度为 0 的隐藏容器里初始化得到空白图** —— Modal、非激活 Tab 中的图表必须在 `clientWidth > 0` 时初始化，或用 ResizeObserver 补初始化。
3. **主题切换后图表仍是旧色** —— `--a2ui-*` 变量变了但 ECharts 已渲染的画布不会自动重绘，需要监听 `data-theme` 手动重设 option。
4. **`base: '/a2ui/'` + hash 路由产生 `/a2ui/a2ui/#/`** —— 需确认最终 URL 形态。
5. **mock 中间件在生产构建中缺失导致白屏** —— 页面必须给出「后端未接入」提示，而不是空白。
6. **适配层绕开 `protocol.ts` 直接 import `@a2ui/*`** —— 会让「换渲染器只改一个文件」的承诺失效；所有 `@a2ui/react` 与 `@a2ui/web_core` 的引用必须收敛在 `src/a2ui/protocol.ts`。

---

## File Structure

```
packages/a2ui-catalog/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── components/
│       ├── Chart.api.ts
│       └── OrderCard.api.ts
└── scripts/
    └── export.ts

packages/a2ui-ui/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── styles/
│   │   └── tokens.css
│   ├── Button.tsx + Button.css
│   ├── Text.tsx + Text.css
│   ├── TextField.tsx + TextField.css
│   ├── Card.tsx + Card.css
│   ├── CheckBox.tsx + CheckBox.css
│   └── Chart.tsx
│       └── chart/echarts-registry.ts

packages/a2ui/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── tsconfig.config.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx            # ④ 入口
    ├── app/
    │   └── App.tsx         # ④ 应用外壳，直接渲染 ChatPage（单页面，不引入路由）
    ├── chat/               # ④ 应用层：界面与传输
    │   ├── ChatPage.tsx
    │   ├── ChatPage.css
    │   ├── Sidebar.tsx
    │   ├── MessageList.tsx
    │   ├── ChatInput.tsx
    │   └── useChat.ts
    ├── a2ui/               # ③ 适配层 + ⑤ 实例化
    │   ├── protocol.ts     # ⑤⑥ 唯一入口：re-export @a2ui/web_core 与 @a2ui/react
    │   ├── catalog.ts      # ③ 产物聚合：basic catalog + 自建组件 → Catalog 实例
    │   ├── processor.ts    # ⑤ MessageProcessor 单例
    │   └── adapters/       # ③ 适配层：字段翻译，交给 ④⑤⑥
    │       ├── Button.tsx
    │       ├── Text.tsx
    │       ├── TextField.tsx
    │       ├── Card.tsx
    │       ├── CheckBox.tsx
    │       ├── Chart.tsx
    │       └── OrderCard.tsx
    └── mock/
        ├── fixtures.ts
        └── middleware.ts
```

**依赖的外部运行时（不在本仓库目录树内，由 npm 提供）：**

| 层 | 包 | 提供 |
|---|---|---|
| ⑤ 协议运行时 | `@a2ui/web_core@0.15.0` | `MessageProcessor`、`Catalog`、`SurfaceModel`、`CommonSchemas`、basic catalog 契约 |
| ⑥ 渲染器 | `@a2ui/react@0.15.0` | `A2uiSurface`、`createComponentImplementation` |

两者只由 `packages/a2ui` 直接依赖，且只经 `src/a2ui/protocol.ts` 引入；`a2ui-catalog` 与 `a2ui-ui` 都不依赖渲染器。

---

### Task 1: 契约包骨架与 Chart 契约

**Files:**
- Create: `packages/a2ui-catalog/package.json`
- Create: `packages/a2ui-catalog/AGENTS.md`
- Create: `packages/a2ui-catalog/tsconfig.json`
- Create: `packages/a2ui-catalog/src/index.ts`
- Create: `packages/a2ui-catalog/src/components/Chart.api.ts`

**Interfaces:**
- Consumes: 无
- Produces: `ChartApi`（`{ name: 'Chart', schema: ZodType }`）、`CHART_KINDS`（`readonly ['bar','hbar','line','area']`）

**不使用 Vite 脚手架。** `a2ui-catalog` 是纯 TypeScript 的契约包，没有浏览器入口、没有 dev server，构建产物由 `scripts/export.ts` 生成而非 Vite。`pnpm create vite` 在这里只会产生无关文件。

- [ ] **Step 1: 创建 `packages/a2ui-catalog/package.json`**

```json
{
  "name": "@white55/a2ui-catalog",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsx scripts/export.ts"
  },
  "dependencies": {
    "@a2ui/web_core": "0.15.0",
    "zod": "3.25.76"
  },
  "devDependencies": {
    "tsx": "4.19.2",
    "typescript": "5.6.3"
  }
}
```

**注意**：`tsx` 的精确版本需在实施时用 `npm view tsx version` 确认后替换为当时的稳定版。

- [ ] **Step 2: 创建 `packages/a2ui-catalog/AGENTS.md`**

```markdown
# a2ui-catalog Package 规则

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md`。
- 本包只存放 A2UI 组件契约（Zod schema）。只有 schema，没有实现。
- 禁止依赖 React、任何 UI 库、任何图表库。`dependencies` 只允许 `@a2ui/web_core` 与 `zod`。
- 新增组件时同时更新 `src/index.ts` 的导出。
- 产出的 `dist/catalog.json` 是构建产物，不进版本控制。
```

- [ ] **Step 3: 创建 `packages/a2ui-catalog/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src/**/*.ts", "scripts/**/*.ts"],
  "exclude": ["node_modules/**", "dist/**"]
}
```

- [ ] **Step 4: 创建 `packages/a2ui-catalog/src/components/Chart.api.ts`**

用 `CommonSchemas` 提供的动态类型，使字段同时接受字面量、`{ path }` 绑定与函数调用。

```ts
import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

export const CHART_KINDS = ['bar', 'hbar', 'line', 'area'] as const

export const ChartApi = {
  name: 'Chart',
  schema: z.object({
    // 图表形态。hbar 表示横向条形图，与 bar 共用同一份数据字段。
    kind: z.enum(CHART_KINDS),
    // 绑定到 dataModel 中的数组，每项至少含 xField 与 series[].field 指定的键。
    data: CommonSchemas.DynamicValue,
    // 分类轴字段名。
    xField: z.string(),
    // 数据系列。每组对应一组柱子或一条线。
    series: z
      .array(
        z.object({
          field: z.string(),
          label: CommonSchemas.DynamicString,
          color: z.string().optional(),
        }),
      )
      .min(1),
    height: z.number().default(240).optional(),
    showLegend: z.boolean().default(true).optional(),
    showValueLabel: z.boolean().default(false).optional(),
    // 大数据渲染模式（预防性字段，当前业务数据量在百行以内用不到）。
    // 保留原因：制造业看板可能出现万级时间序列；届时无需改契约即可提升渲染性能。
    // 三种取值的实际效果见 Chart.tsx 的 toOption 实现：
    //   none     逐点渲染，保留完整 tooltip / hover 交互（默认）
    //   large    启用 ECharts 的 large 模式（large: true, largeThreshold: 2000），
    //            跳过逐点交互检测，换取渲染速度，代价是失去单点 tooltip
    //   sampling 启用 LTTB 降采样（sampling: 'lttb'）+ 渐进渲染（progressive: 400），
    //            在保留趋势拐点的前提下减少绘制点数，适合万级以上数据
    // 若未来实际出现性能问题，排查顺序是：先看 data 行数，再看是否因
    // updateComponents 重发导致实例反复重建，最后才考虑调整此字段。
    optimize: z.enum(['none', 'large', 'sampling']).default('none').optional(),
  }),
}
```

- [ ] **Step 5: 创建 `packages/a2ui-catalog/src/index.ts`**

```ts
export { ChartApi, CHART_KINDS } from './adapters/Chart.api'
```

- [ ] **Step 6: 运行 `pnpm install`，然后 `pnpm --filter @white55/a2ui-catalog exec tsc --noEmit`**

预期：安装成功；类型检查无输出（退出码 0）。

- [ ] **Step 7: 提交**

```bash
git add packages/a2ui-catalog
git commit -m "feat(a2ui-catalog): 建立契约包并定义 Chart 契约"
```

---

### Task 2: OrderCard 契约与 catalog 产物脚本

**Files:**
- Create: `packages/a2ui-catalog/src/components/OrderCard.api.ts`
- Modify: `packages/a2ui-catalog/src/index.ts`
- Create: `packages/a2ui-catalog/scripts/export.ts`

**Interfaces:**
- Consumes: `ChartApi`、`CHART_KINDS`（Task 1）
- Produces: `OrderCardApi`；`scripts/export.ts` 产出 `dist/catalog.json` 与 `dist/VERSION`

- [ ] **Step 1: 创建 `packages/a2ui-catalog/src/components/OrderCard.api.ts`**

```ts
import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

export const OrderCardApi = {
  name: 'OrderCard',
  schema: z.object({
    orderNo: CommonSchemas.DynamicString,
    amount: CommonSchemas.DynamicNumber,
    onView: CommonSchemas.Action,
    checks: CommonSchemas.Checkable.shape.checks,
  }),
}
```

- [ ] **Step 2: 更新 `src/index.ts`**

```ts
export { ChartApi, CHART_KINDS } from './adapters/Chart.api'
export { OrderCardApi } from './adapters/OrderCard.api'
```

- [ ] **Step 3: 创建 `scripts/export.ts`**

合并 basic catalog 与自定义组件后序列化。**注意**：此脚本构造的是「schema 版」catalog，自定义组件用只带 `name` 与 `schema` 的普通对象，不引入 React 实现。

```ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Catalog } from '@a2ui/web_core/v0_9'
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog'
import { ChartApi } from '../src/components/Chart.api'
import { OrderCardApi } from '../src/components/OrderCard.api'

const CATALOG_ID = 'https://leo.example/a2ui/catalog'

// basic 组件是 WebComponentImplementation，自定义组件是只带 name + schema 的普通对象，
// 两者都满足 ComponentApi，无需类型断言。
const merged = new Catalog(
  CATALOG_ID,
  '0.9',
  [...basicCatalog.components.values(), ChartApi, OrderCardApi],
  [...basicCatalog.functions.values()],
)

const json = JSON.stringify(merged.toJson(), null, 2)
const hash = createHash('sha256').update(json).digest('hex')

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'catalog.json'), json)
writeFileSync(
  join(outDir, 'VERSION'),
  JSON.stringify(
    {
      version: '0.1.0',
      hash: `sha256:${hash}`,
      protocolVersion: 'v0.9',
      generatedFrom: process.env.GIT_SHA ?? 'local',
    },
    null,
    2,
  ),
)

console.log(`catalog.json: ${json.length} bytes, hash sha256:${hash.slice(0, 12)}`)
```

- [ ] **Step 4: 运行产物脚本**

Run: `pnpm --filter @white55/a2ui-catalog build`

预期：输出 `catalog.json: <N> bytes, hash sha256:...`；`packages/a2ui-catalog/dist/` 下出现 `catalog.json` 与 `VERSION`。

- [ ] **Step 5: 检查产物包含自定义组件**

Run: `grep -c '"Chart"\|"OrderCard"' packages/a2ui-catalog/dist/catalog.json`

预期：输出 ≥ 2。

- [ ] **Step 6: 确认 `dist` 已被忽略**

Run: `git status --short packages/a2ui-catalog`

预期：不出现 `dist/` 条目。若出现，在根 `.gitignore` 追加 `packages/a2ui-catalog/dist/`。

- [ ] **Step 7: 提交**

```bash
git add packages/a2ui-catalog
git commit -m "feat(a2ui-catalog): 增加 OrderCard 契约与 catalog 产物脚本"
```

---

### Task 3: UI 库骨架与设计 Token

**Files:**
- Create: `packages/a2ui-ui/package.json`
- Create: `packages/a2ui-ui/AGENTS.md`
- Create: `packages/a2ui-ui/tsconfig.json`
- Create: `packages/a2ui-ui/src/styles/tokens.css`
- Create: `packages/a2ui-ui/src/index.ts`

**Interfaces:**
- Consumes: 无
- Produces: `tokens.css`（对外暴露 `--leo-*` 品牌变量并把它们映射到 `--a2ui-*`）

**不使用 Vite 脚手架。** `a2ui-ui` 是被消费的组件库，没有 `index.html`、没有 dev server、不产出可执行页面；`pnpm create vite` 会生成一堆用不上的入口文件，还得逐个删。文件少，直接创建更快也更清楚。

- [ ] **Step 1: 创建 `packages/a2ui-ui/package.json`**

```json
{
  "name": "@white55/a2ui-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/styles/tokens.css"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "1.3.1",
    "echarts": "6.1.0"
  },
  "peerDependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@types/react": "19.2.8",
    "@types/react-dom": "19.2.7",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: 创建 `packages/a2ui-ui/AGENTS.md`**

```markdown
# a2ui-ui Package 规则

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md`。
- 本包是本仓库唯一的 React UI 组件实现层，不知道 A2UI 协议存在。
- 禁止 import `@a2ui/*`、禁止 import `@white55/a2ui` 与 `@white55/a2ui-catalog`。
- 第三方库（echarts、@radix-ui/*）只允许在本包声明与 import。
- 所有样式必须只使用 `--a2ui-*` / `--leo-*` CSS 变量，禁止硬编码颜色与间距。
- 禁止 CSS Grid，布局使用 Flexbox。
- 样式只挂在组件自身 class 上，禁止依赖父级后代选择器（A2UI 会插入 custom element 包裹层）。
```

- [ ] **Step 3: 创建 `packages/a2ui-ui/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules/**"]
}
```

- [ ] **Step 4: 创建 `src/styles/tokens.css`**

品牌层与映射层分开：品牌值只写一次，basic catalog 通过映射层读到同一份值。

```css
:root {
  --leo-brand: #1a73e8;
  --leo-bg: #ffffff;
  --leo-text: #1f1f1f;
  --leo-border: #e5e5e5;
  --leo-radius: 8px;
  --leo-font: 'Inter', system-ui, -apple-system, sans-serif;
  --leo-space-1: 4px;
  --leo-space-2: 8px;
  --leo-space-3: 12px;
  --leo-space-4: 16px;

  /* 映射给 A2UI basic catalog：让两侧读同一份颜色与字体 */
  --a2ui-color-primary: var(--leo-brand);
  --a2ui-color-surface: var(--leo-bg);
  --a2ui-color-background: var(--leo-bg);
  --a2ui-color-on-surface: var(--leo-text);
  --a2ui-color-on-background: var(--leo-text);
  --a2ui-color-border: var(--leo-border);
  --a2ui-border: 1px solid var(--leo-border);
  --a2ui-border-radius: var(--leo-radius);
  --a2ui-font-family-title: var(--leo-font);
}

[data-theme='dark'] {
  --leo-brand: #4a9eff;
  --leo-bg: #121212;
  --leo-text: #e8e8e8;
  --leo-border: #333333;
}
```

- [ ] **Step 5: 创建 `src/index.ts` 占位**

```ts
export {}
```

- [ ] **Step 6: 运行 `pnpm install`，然后 `pnpm typecheck`**

预期：安装成功；类型检查通过。

**注意**：`pnpm typecheck` 目前是逐包点名的脚本，本任务不改根脚本，只确认现有包不受影响。

- [ ] **Step 7: 提交**

```bash
git add packages/a2ui-ui
git commit -m "feat(a2ui-ui): 建立 React UI 库骨架与设计 token"
```

---

### Task 4: 基础组件 —— Button / Text / Card

**Files:**
- Create: `packages/a2ui-ui/src/Button.tsx`
- Create: `packages/a2ui-ui/src/Button.css`
- Create: `packages/a2ui-ui/src/Text.tsx`
- Create: `packages/a2ui-ui/src/Text.css`
- Create: `packages/a2ui-ui/src/Card.tsx`
- Create: `packages/a2ui-ui/src/Card.css`
- Modify: `packages/a2ui-ui/src/index.ts`

**Interfaces:**
- Consumes: `tokens.css`（Task 3）
- Produces:
  - `Button({ variant?: 'default' | 'primary' | 'borderless', disabled?: boolean, onClick?: () => void, children: ReactNode })`
  - `Text({ variant?: 'body' | 'caption' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5', children: ReactNode })`
  - `Card({ children: ReactNode, borderColor?: 'default' | 'danger' | 'warning' })`

- [ ] **Step 1: 创建 `src/Button.tsx`**

接口只保留两侧（固定区域与 A2UI 适配器）都需要的字段，不暴露 UI 库特有的扩展位。

```tsx
import type { ReactNode } from 'react'
import './Button.css'

export interface ButtonProps {
  variant?: 'default' | 'primary' | 'borderless'
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}

export function Button({ variant = 'default', disabled, onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      className={`leo-btn leo-btn--${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: 创建 `src/Button.css`**

```css
.leo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--leo-space-2);
  padding: var(--leo-space-2) var(--leo-space-4);
  border: none;
  cursor: pointer;
  font-family: var(--a2ui-font-family-title);
  font-size: 14px;
  line-height: 1.5;
  border-radius: var(--a2ui-border-radius);
  transition: background-color 120ms ease;
}

.leo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.leo-btn--default {
  background: transparent;
  color: var(--a2ui-color-primary);
  box-shadow: inset 0 0 0 1px var(--a2ui-color-border);
}

.leo-btn--primary {
  background: var(--a2ui-color-primary);
  color: var(--a2ui-color-on-primary);
}

.leo-btn--primary:hover:not(:disabled) {
  background: var(--a2ui-color-primary-hover);
}

.leo-btn--borderless {
  background: transparent;
  color: var(--a2ui-color-primary);
  padding-left: var(--leo-space-2);
  padding-right: var(--leo-space-2);
}
```

- [ ] **Step 3: 创建 `src/Text.tsx`**

```tsx
import type { ElementType, ReactNode } from 'react'
import './Text.css'

export type TextViewVariant = 'body' | 'caption' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5'

export interface TextProps {
  variant?: TextViewVariant
  children: ReactNode
}

// 标题变体渲染成对应语义标签，其余用 span，保证无障碍与 SEO 语义。
const TAG_BY_VARIANT: Record<TextViewVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  body: 'span',
  caption: 'span',
}

export function Text({ variant = 'body', children }: TextProps) {
  const Tag = TAG_BY_VARIANT[variant]
  return <Tag className={`leo-text leo-text--${variant}`}>{children}</Tag>
}
```

- [ ] **Step 4: 创建 `src/Text.css`**

```css
.leo-text {
  margin: 0;
  color: var(--a2ui-color-on-surface);
  font-family: var(--a2ui-font-family-title);
}

.leo-text--body { font-size: 14px; line-height: 1.6; }
.leo-text--caption { font-size: 12px; line-height: 1.5; opacity: 0.7; }
.leo-text--h1 { font-size: 28px; line-height: 1.3; font-weight: 600; }
.leo-text--h2 { font-size: 22px; line-height: 1.35; font-weight: 600; }
.leo-text--h3 { font-size: 18px; line-height: 1.4; font-weight: 600; }
.leo-text--h4 { font-size: 16px; line-height: 1.45; font-weight: 600; }
.leo-text--h5 { font-size: 14px; line-height: 1.5; font-weight: 600; }
```

- [ ] **Step 5: 创建 `src/Card.tsx`**

```tsx
import type { ReactNode } from 'react'
import './Card.css'

export interface CardProps {
  children: ReactNode
  borderColor?: 'default' | 'danger' | 'warning'
}

export function Card({ children, borderColor = 'default' }: CardProps) {
  return <div className={`leo-card leo-card--border-${borderColor}`}>{children}</div>
}
```

- [ ] **Step 6: 创建 `src/Card.css`**

```css
.leo-card {
  display: flex;
  flex-direction: column;
  gap: var(--leo-space-3);
  padding: var(--leo-space-4);
  background: var(--a2ui-color-surface);
  border-radius: var(--a2ui-border-radius);
  box-sizing: border-box;
}

.leo-card--border-default {
  box-shadow: inset 0 0 0 1px var(--a2ui-color-border);
}

.leo-card--border-danger {
  box-shadow: inset 0 0 0 1px #d93f3f;
}

.leo-card--border-warning {
  box-shadow: inset 0 0 0 1px #d99a3f;
}
```

- [ ] **Step 7: 更新 `src/index.ts`**

```ts
export { Button, type ButtonProps } from './Button'
export { Text, type TextProps, type TextViewVariant } from './Text'
export { Card, type CardProps } from './Card'
```

- [ ] **Step 8: 运行 `pnpm --filter @white55/a2ui-ui exec tsc --noEmit`**

预期：通过，无输出。

- [ ] **Step 9: 提交**

```bash
git add packages/a2ui-ui
git commit -m "feat(a2ui-ui): 实现 Button、Text、Card 基础组件"
```

---

### Task 5: 表单组件 —— TextField / CheckBox

**Files:**
- Create: `packages/a2ui-ui/src/TextField.tsx`
- Create: `packages/a2ui-ui/src/TextField.css`
- Create: `packages/a2ui-ui/src/CheckBox.tsx`
- Create: `packages/a2ui-ui/src/CheckBox.css`
- Modify: `packages/a2ui-ui/src/index.ts`

**Interfaces:**
- Consumes: `tokens.css`（Task 3）
- Produces:
  - `TextField({ label?: string, value?: string, placeholder?: string, disabled?: boolean, invalid?: boolean, onChange?: (value: string) => void })`
  - `CheckBox({ label?: string, checked?: boolean, disabled?: boolean, onChange?: (checked: boolean) => void })`

- [ ] **Step 1: 创建 `src/TextField.tsx`**

`onChange` 直接回传字符串，不暴露原生事件对象，避免适配层再做一层解包。

```tsx
import { useId } from 'react'
import './TextField.css'

export interface TextFieldProps {
  label?: string
  value?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  onChange?: (value: string) => void
}

export function TextField({
  label,
  value,
  placeholder,
  disabled,
  invalid,
  onChange,
}: TextFieldProps) {
  const id = useId()
  return (
    <div className={`leo-field${invalid ? ' leo-field--invalid' : ''}`}>
      {label ? (
        <label className="leo-field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className="leo-field__input"
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/TextField.css`**

```css
.leo-field {
  display: flex;
  flex-direction: column;
  gap: var(--leo-space-1);
}

.leo-field__label {
  font-size: 13px;
  color: var(--a2ui-color-on-surface);
  font-family: var(--a2ui-font-family-title);
}

.leo-field__input {
  padding: var(--leo-space-2) var(--leo-space-3);
  border: 1px solid var(--a2ui-color-border);
  border-radius: var(--a2ui-border-radius);
  background: var(--a2ui-color-surface);
  color: var(--a2ui-color-on-surface);
  font-family: var(--a2ui-font-family-title);
  font-size: 14px;
  outline: none;
  transition: border-color 120ms ease;
}

.leo-field__input:focus {
  border-color: var(--a2ui-color-primary);
}

.leo-field__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.leo-field--invalid .leo-field__input {
  border-color: #d93f3f;
}
```

- [ ] **Step 3: 创建 `src/CheckBox.tsx`**

不使用原生 `<label>` 包裹 input 的写法，避免与右侧 custom element 包裹层的点击行为冲突。

```tsx
import { useId } from 'react'
import './CheckBox.css'

export interface CheckBoxProps {
  label?: string
  checked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

export function CheckBox({ label, checked, disabled, onChange }: CheckBoxProps) {
  const id = useId()
  return (
    <div className="leo-checkbox">
      <input
        id={id}
        className="leo-checkbox__input"
        type="checkbox"
        checked={checked ?? false}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      {label ? (
        <label className="leo-checkbox__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: 创建 `src/CheckBox.css`**

```css
.leo-checkbox {
  display: flex;
  align-items: center;
  gap: var(--leo-space-2);
}

.leo-checkbox__input {
  width: 16px;
  height: 16px;
  accent-color: var(--a2ui-color-primary);
  cursor: pointer;
  margin: 0;
}

.leo-checkbox__input:disabled {
  cursor: not-allowed;
}

.leo-checkbox__label {
  font-size: 14px;
  color: var(--a2ui-color-on-surface);
  font-family: var(--a2ui-font-family-title);
  cursor: pointer;
}
```

- [ ] **Step 5: 更新 `src/index.ts`**

```ts
export { Button, type ButtonProps } from './Button'
export { Text, type TextProps, type TextViewVariant } from './Text'
export { Card, type CardProps } from './Card'
export { TextField, type TextFieldProps } from './TextField'
export { CheckBox, type CheckBoxProps } from './CheckBox'
```

- [ ] **Step 6: 运行 `pnpm --filter @white55/a2ui-ui exec tsc --noEmit`**

预期：通过。

- [ ] **Step 7: 提交**

```bash
git add packages/a2ui-ui
git commit -m "feat(a2ui-ui): 实现 TextField 与 CheckBox 表单组件"
```

---

### Task 6: ECharts 注册与图表组件

**Files:**
- Create: `packages/a2ui-ui/src/chart/echarts-registry.ts`
- Create: `packages/a2ui-ui/src/Chart.tsx`
- Modify: `packages/a2ui-ui/src/index.ts`

**Interfaces:**
- Consumes: `echarts@6.1.0`（Task 3 已声明）
- Produces: `Chart({ kind, data, xField, series, height?, showLegend?, showValueLabel? })`

- [ ] **Step 1: 创建 `src/chart/echarts-registry.ts`**

只 `use` 实际用到的图表与组件，避免全量 `import * as echarts from 'echarts'` 把地图、GL、所有图表类型都打进产物。

```ts
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

export { echarts }
```

- [ ] **Step 2: 创建 `src/Chart.tsx`**

三个必须分开的 effect：初始化只跑一次、数据变化只 `setOption`、主题切换手动重绘。ECharts 不会跟随容器尺寸，必须挂 `ResizeObserver`。

```tsx
import { useEffect, useRef } from 'react'
import type { EChartsType, EChartsCoreOption } from 'echarts/core'
import { echarts } from './chart/echarts-registry'

export const CHART_KINDS = ['bar', 'hbar', 'line', 'area'] as const
export type ChartKind = (typeof CHART_KINDS)[number]

export interface ChartSeries {
  field: string
  label: string
  color?: string
}

export interface ChartProps {
  kind: ChartKind
  data: Record<string, unknown>[]
  xField: string
  series: ChartSeries[]
  height?: number
  showLegend?: boolean
  showValueLabel?: boolean
  optimize?: 'none' | 'large' | 'sampling'
}

export function A2uiChartComponent(props: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<EChartsType>()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const instance = echarts.init(el)
    chartRef.current = instance

    // ECharts 不跟随容器尺寸；隐藏容器（Modal / 非激活 Tab）宽度为 0 时 resize 也无意义
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0) instance.resize()
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      instance.dispose()
      chartRef.current = undefined
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption(toOption(props), { notMerge: true })
  }, [
    props.kind,
    props.data,
    props.xField,
    props.series,
    props.showLegend,
    props.showValueLabel,
    props.optimize,
  ])

  // 主题切换时 CSS 变量变了，但已渲染的 canvas 不会自动重绘
  useEffect(() => {
    const observer = new MutationObserver(() => {
      chartRef.current?.setOption(toOption(props), { notMerge: true })
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [props])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: props.height ?? 240 }}
    />
  )
}

function readVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

// A2UI 声明 -> ECharts option 的唯一转换点
function toOption(p: ChartProps): EChartsCoreOption {
  const rows = Array.isArray(p.data) ? p.data : []
  const isHorizontal = p.kind === 'hbar'
  const isLineLike = p.kind === 'line' || p.kind === 'area'

  const textColor = readVar('--a2ui-color-on-surface', '#1f1f1f')
  const borderColor = readVar('--a2ui-color-border', '#e5e5e5')
  const brandColor = readVar('--a2ui-color-primary', '#1a73e8')

  const categoryAxis = {
    type: 'category' as const,
    data: rows.map((row) => String(row[p.xField] ?? '')),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: borderColor } },
    axisLabel: { color: textColor },
  }

  const valueAxis = {
    type: 'value' as const,
    splitLine: { lineStyle: { color: borderColor } },
    axisLabel: { color: textColor },
  }

  return {
    animation: false,
    // 横条图只需对调两个轴
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    tooltip: { trigger: 'axis' },
    legend: p.showLegend === false
      ? undefined
      : { bottom: 0, textStyle: { color: textColor } },
    grid: {
      left: 48,
      right: 16,
      top: 16,
      bottom: p.showLegend === false ? 24 : 48,
      containLabel: true,
    },
    series: p.series.map((s, index) => ({
      type: isLineLike ? 'line' : 'bar',
      name: typeof s.label === 'string' ? s.label : String(s.label ?? ''),
      data: rows.map((row) => Number(row[s.field] ?? 0)),
      smooth: isLineLike,
      areaStyle: p.kind === 'area' ? {} : undefined,
      itemStyle: { color: s.color ?? (index === 0 ? brandColor : undefined) },
      label: p.showValueLabel ? { show: true, position: 'top', color: textColor } : undefined,
      barMaxWidth: 32,
      // 大数据渲染模式。当前业务数据量用不到，保留为契约层的预防性能力，
      // 避免将来出现万级数据时要改契约与后端 prompt。
      ...(p.optimize === 'large'
        ? {
            // large 模式批量绘制，跳过逐点命中检测；代价是失去单点 tooltip。
            large: true,
            largeThreshold: 2000,
          }
        : {}),
      ...(p.optimize === 'sampling'
        ? {
            // LTTB 降采样保留趋势拐点，progressive 分帧渲染避免主线程长时间阻塞。
            sampling: 'lttb',
            progressive: 400,
            progressiveThreshold: 3000,
          }
        : {}),
    })),
  }
}
```

- [ ] **Step 3: 更新 `src/index.ts`**

```ts
export { Button, type ButtonProps } from './Button'
export { Text, type TextProps, type TextViewVariant } from './Text'
export { Card, type CardProps } from './Card'
export { TextField, type TextFieldProps } from './TextField'
export { CheckBox, type CheckBoxProps } from './CheckBox'
export {
  A2uiChartComponent,
  CHART_KINDS,
  type ChartKind,
  type ChartProps,
  type ChartSeries,
} from './Chart'
```

- [ ] **Step 4: 运行 `pnpm --filter @white55/a2ui-ui exec tsc --noEmit`**

预期：通过。若 `EChartsCoreOption` 对 `xAxis` / `yAxis` 的联合类型报错，改为 `as EChartsCoreOption` 收窄。

- [ ] **Step 5: 提交**

```bash
git add packages/a2ui-ui
git commit -m "feat(a2ui-ui): 实现引擎模式的 Chart 组件"
```

---

### Task 7: 应用包骨架与构建配置

**Files:**
- Scaffold: `pnpm create vite packages/a2ui --template react-ts`（生成基础结构，随后覆盖）
- Create: `packages/a2ui/package.json`（替换模板版本）
- Create: `packages/a2ui/AGENTS.md`
- Create: `packages/a2ui/tsconfig.json`
- Create: `packages/a2ui/tsconfig.config.json`
- Create: `packages/a2ui/vite.config.ts`
- Modify: `packages/a2ui/index.html`（模板生成，改写）
- Modify: `packages/a2ui/src/main.tsx`（模板生成，改写）
- Move: `packages/a2ui/src/App.tsx` → `packages/a2ui/src/app/App.tsx`（模板生成，移动并改写）
- Delete: 模板的 `.gitignore` / `eslint.config.js` / `public/` / `src/assets/` / `src/index.css` / `src/App.css` / `tsconfig.app.json` / `tsconfig.node.json`

**Interfaces:**
- Consumes: `@white55/a2ui-ui`（Task 3~5）
- Produces: 可启动的 `/a2ui` 应用外壳

**脚手架方式：** 用 Vite 官方的 React + TypeScript 模板生成，再按仓库约定覆盖。**不要手写全部文件**，也不要引入模板没要求的额外工具（ESLint / Prettier 配置由根仓库统一提供，`packages/` 下其余包都没有自己的 lint 配置）。

```bash
pnpm create vite packages/a2ui --template react-ts
```

模板会生成 `.gitignore`、`eslint.config.js`、`public/vite.svg`、`src/App.css`、`src/index.css`、`src/assets/react.svg` 等文件，**逐个删除或替换**：

| 模板产物 | 处理 |
|---|---|
| `.gitignore` | 删除（根 `.gitignore` 已含 `dist-vite`） |
| `eslint.config.js` | 删除（用根 `eslint.config.mjs`） |
| `public/vite.svg` | 删除 |
| `src/index.css` / `src/App.css` | 删除（样式走 `@white55/a2ui-ui/tokens.css` 与组件自带的 CSS） |
| `src/assets/react.svg` | 删除（整个 `src/assets/` 目录） |
| `src/App.tsx` | 移到 `src/app/App.tsx` 并改写为占位 |
| `src/main.tsx` | 保留，按下面的内容改写 |
| `index.html` | 保留，按下面的内容改写 |

**不要**执行 `pnpm create vite` 后立刻 `pnpm install` —— 先把 `package.json` 换成下面 Step 1 的内容（含精确版本与 `workspace:*` 依赖），再统一安装一次。

- [ ] **Step 1: 用 Vite 官方模板生成骨架，然后替换 `package.json`**

先执行脚手架命令生成基础结构（这一步会在 `packages/a2ui/` 下创建文件，但**先不要安装依赖**）：

```bash
pnpm create vite packages/a2ui --template react-ts
```

然后把生成的 `package.json` **整体替换**为下面内容 —— 模板给的是 `^` 范围版本和非精确的 React，本仓库要求精确版本，且没有 `workspace:*` 依赖。

```json
{
  "name": "@white55/a2ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:vite": "vite --mode development",
    "build:vite": "vite build --mode production",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@a2ui/react": "0.15.0",
    "@a2ui/web_core": "0.15.0",
    "@white55/a2ui-catalog": "workspace:*",
    "@white55/a2ui-ui": "workspace:*",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@types/react": "19.2.8",
    "@types/react-dom": "19.2.7",
    "@vitejs/plugin-react": "5.2.0",
    "typescript": "5.6.3",
    "vite": "6.0.11"
  }
}
```

**注意**：`@vitejs/plugin-react@5.2.0` 的 peer 支持 `vite ^4 || ^5 || ^6 || ^7 || ^8`，与仓库锁定的 `6.0.11` 兼容。**不要用 6.x**（peer 要求 Vite 8）。

- [ ] **Step 2: 清理模板产物**

删除模板生成、但本仓库不用的文件：

```bash
rm -f packages/a2ui/.gitignore packages/a2ui/eslint.config.js
rm -rf packages/a2ui/src/assets packages/a2ui/public
rm -f packages/a2ui/src/index.css packages/a2ui/src/App.css
```

保留 `index.html`、`src/main.tsx`、`src/App.tsx`，后续步骤会改写它们（`src/App.tsx` 稍后移到 `src/app/`）。

验证清理结果：

```bash
ls -A packages/a2ui
```

预期只剩：`AGENTS.md`（Step 2 创建）、`index.html`、`package.json`、`src`、`tsconfig.json`、`tsconfig.config.json`、`vite.config.ts`（这几个后续步骤创建）。若模板另生成了 `tsconfig.app.json` / `tsconfig.node.json`，一并删除 —— 本包用仓库统一的 `tsconfig.json` + `tsconfig.config.json` 两分法，不用模板的三分法。

- [ ] **Step 3: 创建 `packages/a2ui/AGENTS.md`**

```markdown
# a2ui 应用 Package 规则

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md`。
- 本包是 `/a2ui` 子路径的 React 应用，独立构建到 `dist-vite/a2ui`。
- `src/a2ui/protocol.ts` 是 `@a2ui/react` 与 `@a2ui/web_core` 的唯一入口，其余文件禁止直接 import `@a2ui/*`。
- 目录分工：`src/chat/**` 管网络与界面状态，`src/a2ui/adapters/**` 管协议字段翻译，两者不互相引用。
- `src/a2ui/adapters/**` 是适配层：禁止 import `echarts`、`@radix-ui/*`。
- `src/chat/**` 可直接用 `@white55/a2ui-ui`；右侧 A2UI 渲染区只能经 `src/a2ui/adapters/**`。
- 禁止 CSS Grid，布局使用 Flexbox。
- 禁止 import `@white55/web`（主站应用）。
```

- [ ] **Step 4: 创建 `packages/a2ui/tsconfig.json`**

只检查应用源码，不含 `vite.config.ts`（那份交给独立的 `tsconfig.config.json`）。

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules/**", "../../dist-vite/**"]
}
```

- [ ] **Step 5: 创建 `packages/a2ui/tsconfig.config.json`**

照 `apps/web/tsconfig.config.json` 的既有做法，单独检查 Vite 配置文件的类型。配置文件运行在 Node 里，不该带浏览器类型，所以 `types` 置空、`allowJs` 关闭。

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    // 配置文件只做类型检查，不允许 JavaScript 混入。
    "allowJs": false,
    // Vite 配置不依赖自动注入的浏览器类型集合。
    "types": []
  },
  // 只检查 Vite 配置，不扫描应用源码。
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: 创建 `vite.config.ts`**

`base` 用 `/a2ui/`，产物直接落到仓库根 `dist-vite/a2ui`，与 `storybook`、`ideaone` 平级。

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/a2ui/',
  plugins: [react()],
  build: {
    outDir: '../../dist-vite/a2ui',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 7: 改写 `index.html`**

模板的 `index.html` 里 `<title>` 是 `Vite + React + TS`，`favicon` 指向已删除的 `vite.svg`，需整体替换为下面内容（`base: '/a2ui/'` 会让 Vite 自动把 `/src/main.tsx` 重写为 `/a2ui/src/main.tsx`，这里保持源码写法即可）：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>A2UI 测试</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: 移动并改写 `src/App.tsx` → `src/app/App.tsx`**

模板生成的 `src/App.tsx` 引用了已删除的 `App.css` 和 `react.svg`，先移位置再整体改写：

```bash
mkdir -p packages/a2ui/src/app
git mv packages/a2ui/src/App.tsx packages/a2ui/src/app/App.tsx 2>/dev/null || mv packages/a2ui/src/App.tsx packages/a2ui/src/app/App.tsx
```

改写为占位内容：

```tsx
export function App() {
  return <div>A2UI</div>
}
```

- [ ] **Step 9: 改写 `src/main.tsx`**

模板的 `main.tsx` 引用了已删除的 `index.css`，必须改写。引入 `tokens.css` 后全局样式生效，basic catalog 的 `--a2ui-*` 变量才有值。

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@white55/a2ui-ui/tokens.css'
import { App } from './app/App'

const container = document.getElementById('root')
if (!container) throw new Error('缺少 #root 挂载点')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 10: 运行 `pnpm install` 与 `pnpm check:vite`**

Run: `pnpm install && pnpm check:vite`

预期：安装成功；输出 `Vite 版本一致：6.0.11`。

- [ ] **Step 11: 运行 `pnpm --filter @white55/a2ui typecheck`**

预期：通过。

- [ ] **Step 12: 运行 `pnpm --filter @white55/a2ui dev:vite` 并访问 `http://localhost:5173/a2ui/`**

预期：页面显示 `A2UI`。确认地址栏是 `/a2ui/` 而不是 `/a2ui/a2ui/`。

- [ ] **Step 13: 提交**

```bash
git add packages/a2ui
git commit -m "feat(a2ui): 建立应用包骨架与 Vite 构建配置"
```

---

### Task 8: 协议入口、Catalog 合并与处理器

**Files:**
- Create: `packages/a2ui/src/a2ui/protocol.ts`
- Create: `packages/a2ui/src/a2ui/adapters/Button.tsx`
- Create: `packages/a2ui/src/a2ui/adapters/Text.tsx`
- Create: `packages/a2ui/src/a2ui/adapters/Card.tsx`
- Create: `packages/a2ui/src/a2ui/adapters/TextField.tsx`
- Create: `packages/a2ui/src/a2ui/adapters/CheckBox.tsx`
- Create: `packages/a2ui/src/a2ui/adapters/Chart.tsx`
- Create: `packages/a2ui/src/a2ui/adapters/OrderCard.tsx`
- Create: `packages/a2ui/src/a2ui/catalog.ts`
- Create: `packages/a2ui/src/a2ui/processor.ts`

**Interfaces:**
- Consumes: `ChartApi`、`OrderCardApi`（Task 1~2）；所有 UI 组件（Task 4~6）
- Produces: `APP_CATALOG`（`Catalog`）、`processor`（`MessageProcessor`）、`CATALOG_VERSION`

- [ ] **Step 1: 创建 `src/a2ui/protocol.ts`**

⑤ 协议运行时与 ⑥ 渲染器的唯一入口。这样分层：数据前两行来自渲染器（`@a2ui/react`，负责把组件树变成 DOM），后三段来自协议运行时（`@a2ui/web_core`，负责消息处理、状态与契约）。将来更换渲染器只改这个文件；升级到 v1.0 时本文件改动最小，但还需按设计文档 4.1 核对 `@a2ui/react` 是否已提供 v1.0 类型支持。

```ts
export { A2uiSurface, createComponentImplementation } from '@a2ui/react/v0_9'
export type { ReactA2uiComponentProps, ReactCatalogComponent } from '@a2ui/react/v0_9'
export { MessageProcessor, Catalog, CommonSchemas } from '@a2ui/web_core/v0_9'
export type {
  ActionPayload,
  ComponentApi,
  A2uiMessage,
  ProcessableMessagePayload,
  SurfaceModel,
} from '@a2ui/web_core/v0_9'
export {
  basicCatalog,
  TextApi,
  ButtonApi,
  CardApi,
  TextFieldApi,
  CheckBoxApi,
} from '@a2ui/web_core/v0_9/basic_catalog'
```

**为什么 `basic_catalog` 单独一行**：`v0_9/index.d.ts` 虽然也有 `export * from './basic_catalog/index.js'`，但官方把部分符号在主入口标了 `@deprecated`，指引改用 `@a2ui/web_core/v0_9/basic_catalog`。两处都能解析，按官方意图走子路径，语义上也能区分「协议核心」与「基础组件契约」。

- [ ] **Step 2: 创建 `src/a2ui/adapters/Button.tsx`**

适配层不做任何样式，只翻译字段。`props.action` 在 A2UI 中已经是可调用函数。

```tsx
import { ButtonApi, createComponentImplementation } from '../protocol'
import { Button } from '@white55/a2ui-ui'

export const A2uiButton = createComponentImplementation(
  ButtonApi,
  ({ props, buildChild }) => (
    <Button
      variant={props.variant}
      disabled={props.isValid === false}
      onClick={() => void props.action()}
    >
      {props.child ? buildChild(props.child) : null}
    </Button>
  ),
)
```

**已核验**：`ResolveA2uiProp` 把 `CommonSchemas.Action` 解析为 `(options?: ActionDispatchOptions) => Promise<void> | undefined`（`Action` 在 basic 契约里是必填，故不为 undefined，但类型上仍带 `| undefined`）。因此调用前需要收窄，写成 `onClick={() => void props.action?.()}`。`props.child` 是 `z.ZodString`，解析后为 `string | undefined`，`buildChild` 接受 `ComponentNode | string`。

- [ ] **Step 3: 创建 `src/a2ui/adapters/Text.tsx`**

复用 basic catalog 的 `TextApi` 契约，只替换渲染实现，保证 `catalog.json` 与官方一致。

```tsx
import { TextApi, createComponentImplementation } from '../protocol'
import { Text as UiText, type TextViewVariant } from '@white55/a2ui-ui'

export const A2uiText = createComponentImplementation(
  TextApi,
  ({ props }) => (
    <UiText variant={(props.variant ?? 'body') as TextViewVariant}>
      {props.text}
    </UiText>
  ),
)
```

**已核验**：`TextApi` / `CardApi` / `TextFieldApi` / `CheckBoxApi` 均由 `@a2ui/web_core/v0_9/basic_catalog` 的 `export * from './adapters/index.js'` 提供，已在 `protocol.ts` 统一 re-export，本文件及后续适配器只从 `../protocol` 引入。

- [ ] **Step 4: 创建 `src/a2ui/adapters/Card.tsx`**

```tsx
import { CardApi, createComponentImplementation } from '../protocol'
import { Card } from '@white55/a2ui-ui'

export const A2uiCard = createComponentImplementation(
  CardApi,
  ({ props, buildChild }) => <Card>{props.child ? buildChild(props.child) : null}</Card>,
)
```

- [ ] **Step 5: 创建 `src/a2ui/adapters/TextField.tsx`**

```tsx
import { TextFieldApi, createComponentImplementation } from '../protocol'
import { TextField } from '@white55/a2ui-ui'

export const A2uiTextField = createComponentImplementation(
  TextFieldApi,
  ({ props }) => (
    <TextField
      label={typeof props.label === 'string' ? props.label : undefined}
      value={typeof props.value === 'string' ? props.value : ''}
      invalid={props.isValid === false}
      onChange={(next) => props.setValue?.(next)}
    />
  ),
)
```

**已核验**：`GenerateSetters` 为每个动态属性生成同名 setter，`value: DynamicString` 对应 `setValue(value: string) => void`，`props.setValue` 真实存在。

- [ ] **Step 6: 创建 `src/a2ui/adapters/CheckBox.tsx`**

```tsx
import { CheckBoxApi, createComponentImplementation } from '../protocol'
import { CheckBox } from '@white55/a2ui-ui'

export const A2uiCheckBox = createComponentImplementation(
  CheckBoxApi,
  ({ props }) => (
    <CheckBox
      label={typeof props.label === 'string' ? props.label : undefined}
      checked={props.value === true}
      onChange={(next) => props.setValue?.(next)}
    />
  ),
)
```

- [ ] **Step 7: 创建 `src/a2ui/adapters/Chart.tsx`**

```tsx
import { ChartApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import {
  A2uiChartComponent,
  type ChartKind,
  type ChartSeries,
} from '@white55/a2ui-ui'

export const A2uiChart = createComponentImplementation(
  ChartApi,
  ({ props }) => (
    <A2uiChartComponent
      kind={props.kind as ChartKind}
      data={Array.isArray(props.data) ? (props.data as Record<string, unknown>[]) : []}
      xField={props.xField}
      series={props.series.map(
        (item): ChartSeries => ({
          field: item.field,
          // 契约里 label 是 DynamicString，解析后可能为 undefined；
          // UI 层要求必有 label，这里退化为空字符串，避免图表图例出现 "undefined"
          label: typeof item.label === 'string' ? item.label : '',
          color: item.color,
        }),
      )}
      height={props.height}
      showLegend={props.showLegend}
      showValueLabel={props.showValueLabel}
      optimize={props.optimize}
    />
  ),
)
```

**注意**：`props.series` 的元素结构由 `ChartApi.schema` 决定（`{ field, label, color? }`），逐项映射而不是整体 `as`，既避免断言又让 `label` 的 `undefined` 分支被显式处理。`props.data` 解析后是 `unknown`（`DynamicValue`），必须先 `Array.isArray` 收窄再断言元素为 `Record<string, unknown>[]`。

- [ ] **Step 8: 创建 `src/a2ui/adapters/OrderCard.tsx`**

自定义组件只做数据整形，卡片外壳交给 JSON 里的 `Card`，保证与左侧固定区域视觉同源。

```tsx
import { OrderCardApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { Button, Text } from '@white55/a2ui-ui'

export const A2uiOrderCard = createComponentImplementation(
  OrderCardApi,
  ({ props }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text variant="h4">{String(props.orderNo ?? '')}</Text>
      <Text variant="body">¥{String(props.amount ?? '')}</Text>
      <Button variant="primary" onClick={() => void props.onView?.()}>
        <Text variant="body">查看</Text>
      </Button>
    </div>
  ),
)
```

**注意**：`OrderCardApi.schema` 里的 `checks: CommonSchemas.Checkable.shape.checks` 写法已核验 —— `CommonSchemas.Checkable` 是 `z.ZodObject` 且公开 `shape`，`shape.checks` 是 `ZodOptional<ZodArray<...>>`，可以这样组合。`orderNo` / `amount` 是 `DynamicString` / `DynamicNumber`，解析后可能是 `string | number | undefined`，用 `String(... ?? '')` 收窄是安全的。

- [ ] **Step 9: 创建 `src/a2ui/catalog.ts`**

被覆盖的 basic 组件需要从原集合里剔除，否则 `Catalog` 内部的 `Map.set` 会让后写的胜出，但保留重复项会让 `catalog.json` 与运行时不一致。

两份清单（`OVERRIDDEN` 与 `selfBuilt`）必须互相印证：`selfBuilt` 里每个覆盖项的名字都得在 `OVERRIDDEN` 里，`OVERRIDDEN` 里每个名字都得在 `selfBuilt` 里找到实现。任一处拼错都会导致「basic 里剔除了、自建里没补上」，页面上那个组件直接消失且不报错。

```ts
import { Catalog, basicCatalog } from './protocol'
import type { ReactCatalogComponent } from './protocol'
import { A2uiButton } from './adapters/Button'
import { A2uiText } from './adapters/Text'
import { A2uiCard } from './adapters/Card'
import { A2uiTextField } from './adapters/TextField'
import { A2uiCheckBox } from './adapters/CheckBox'
import { A2uiChart } from './adapters/Chart'
import { A2uiOrderCard } from './adapters/OrderCard'

export const CATALOG_ID = 'https://leo.example/a2ui/catalog'
export const CATALOG_VERSION = '0.1.0'

// 与 basic catalog 同名、需要用自建实现替换的组件。
// Icon 不在其中：左侧固定区域不需要图标，右侧直接用 basic 的 Web Component 即可。
const OVERRIDDEN = new Set(['Text', 'Button', 'Card', 'TextField', 'CheckBox'])

const selfBuilt: ReactCatalogComponent[] = [
  A2uiText,
  A2uiButton,
  A2uiCard,
  A2uiTextField,
  A2uiCheckBox,
  A2uiChart,
  A2uiOrderCard,
]

// 开发期校验两份清单一致。生产构建时 import.meta.env.DEV 为 false，整块被裁掉。
if (import.meta.env.DEV) {
  const selfNames = new Set(selfBuilt.map((c) => c.name))
  for (const name of OVERRIDDEN) {
    if (!selfNames.has(name)) {
      throw new Error(`OVERRIDDEN 含 ${name}，但 selfBuilt 里没有同名实现`)
    }
  }
  for (const component of selfBuilt) {
    // 覆盖集合之外的自建组件若与 basic 重名，会被 Map.set 静默覆盖
    if (basicCatalog.components.has(component.name) && !OVERRIDDEN.has(component.name)) {
      throw new Error(`${component.name} 与 basic catalog 重名，但未加入 OVERRIDDEN`)
    }
  }
}

export const APP_CATALOG: Catalog<ReactCatalogComponent> = new Catalog<ReactCatalogComponent>(
  CATALOG_ID,
  '0.9',
  [
    ...basicCatalog.components.values().filter((c) => !OVERRIDDEN.has(c.name)),
    ...selfBuilt,
  ],
  [...basicCatalog.functions.values()],
)
```

**为什么显式写 `Catalog<ReactCatalogComponent>`**：`basicCatalog` 的类型是 `Catalog<WebComponentImplementation>`，与自建的 `ReactComponentImplementation` 混在一起时，若不显式标注，`T` 会被推断成两者的联合。随后 `MessageProcessor` 也会继承这个联合类型，`getSurfaces()` 返回 `SurfaceModel<联合>`，而 `A2uiSurface` 要求 `SurfaceModel<ReactCatalogComponent>` —— 由于 `SurfaceModel` 含有 `ReadonlyMap<string, Catalog<T>>` 这类入参位置，联合类型不在逆变位置兼容，会直接编译报错。`ReactCatalogComponent` 本身就是 `ReactComponentImplementation | WebComponentImplementation`，用它做 `T` 既准确又能让下游对齐。

同时 `selfBuilt` 与 `basicCatalog.components.values()` 的产物都属于 `ReactCatalogComponent`，无需类型断言。

- [ ] **Step 10: 创建 `src/a2ui/processor.ts`**

```ts
import { MessageProcessor } from './protocol'
import type { ActionPayload } from './protocol'
import { APP_CATALOG } from './catalog'

export const processor = new MessageProcessor(
  [APP_CATALOG],
  (action: ActionPayload) => {
    // 后端未接入时只在控制台留痕，便于验证 action 链路
    console.info('[a2ui] action', action)
    void fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    }).catch(() => {
      console.warn('[a2ui] /api/action 不可用，action 未回传')
    })
  },
  { reportErrorsOnly: true },
)
```

**已核验**：`MessageProcessor` 的构造签名为 `(catalogs: Catalog<any>[], actionHandler?: ActionListener, options?: MessageProcessorOptions)`；`ActionListener = (action: ActionPayload) => void | Promise<void>`；`ActionPayload` 含 `name` / `surfaceId` / `sourceComponentId` / `timestamp` / `context`，可直接从 `@a2ui/web_core/v0_9` 引入，不需要自定义 `ActionPayloadLike` 接口。`MessageProcessorOptions` 有 `reportErrorsOnly` 字段。

- [ ] **Step 11: 运行 `pnpm --filter @white55/a2ui typecheck`**

预期：通过。类型不匹配时按编译器报出的具体位置修正，不要用 `any` 或 `as never` 掩盖 —— 类型报错通常说明某一层契约与实现真的不一致。

- [ ] **Step 12: 提交**

```bash
git add packages/a2ui/src
git commit -m "feat(a2ui): 建立协议入口、catalog 合并与消息处理器"
```

---

### Task 9: SSE 消费与聊天式布局

**Files:**
- Create: `packages/a2ui/src/chat/useChat.ts`
- Create: `packages/a2ui/src/chat/Sidebar.tsx`
- Create: `packages/a2ui/src/chat/MessageList.tsx`
- Create: `packages/a2ui/src/chat/ChatInput.tsx`
- Create: `packages/a2ui/src/chat/ChatPage.tsx`
- Create: `packages/a2ui/src/chat/ChatPage.css`
- Modify: `packages/a2ui/src/app/App.tsx`

**Interfaces:**
- Consumes: `processor`（Task 8）、UI 组件（Task 4~5）
- Produces: `useChat()` 返回 `{ messages, surfaces, send, sending }`

- [ ] **Step 1: 创建 `src/chat/useChat.ts`**

按行切分 SSE，并保留最后一段不完整的行；版本头不一致只告警不阻断。

```ts
import { useCallback, useEffect, useState } from 'react'
import type { A2uiMessage, SurfaceModel } from '../a2ui/protocol'
import { processor } from '../a2ui/processor'
import { CATALOG_VERSION } from '../a2ui/catalog'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export function useChat() {
  const [surfaces, setSurfaces] = useState<SurfaceModel[]>(() => [
    ...processor.getSurfaces().values(),
  ])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)

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

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text }])
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const serverVersion = res.headers.get('X-A2UI-Version')
      if (serverVersion && serverVersion !== CATALOG_VERSION) {
        console.warn(`[a2ui] 版本不一致：前端 ${CATALOG_VERSION} / 后端 ${serverVersion}`)
      }

      if (!res.body) throw new Error('响应没有 body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let received = 0

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        const batch: A2uiMessage[] = []
        for (const raw of lines) {
          const line = (raw.startsWith('data:') ? raw.slice(5) : raw).trim()
          if (!line || line === '[DONE]') continue
          try {
            batch.push(JSON.parse(line) as A2uiMessage)
          } catch {
            // 不完整的行留给下一轮；这里跳过非法 JSON
          }
        }
        if (batch.length > 0) {
          processor.processMessages(batch)
          received += batch.length
        }
      }

      if (received > 0) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', text: '已生成界面' },
        ])
      }
    } catch (error) {
      console.error('[a2ui] 发送失败', error)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: '后端未接入：/api/chat 不可用。请确认本地 mock 中间件已启动。',
        },
      ])
    } finally {
      setSending(false)
    }
  }, [])

  return { messages, surfaces, send, sending }
}
```

**已核验**：`processor.onSurfaceCreated(handler)` 与 `processor.onSurfaceDeleted(handler)` 是 `MessageProcessor` 自身的方法（不是 `processor.model` 上的），返回 `Subscription`，订阅用 `unsubscribe()`。`processor.getSurfaces()` 返回 `ReadonlyMap<string, SurfaceModel>`。`processMessages` 接受 `readonly ProcessableMessage[]`，`A2uiMessage[]` 可直接传入。

- [ ] **Step 2: 创建 `src/chat/MessageList.tsx`**

```tsx
import type { ChatMessage } from './useChat'

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="chat-messages">
      {messages.length === 0 ? (
        <p className="chat-empty">输入一句话开始生成界面</p>
      ) : (
        messages.map((m) => (
          <div key={m.id} className={`chat-message chat-message--${m.role}`}>
            {m.text}
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 3: 创建 `src/chat/ChatInput.tsx`**

`Button` 在 Task 4 中固定 `type="button"`，因此这里用 `onClick` 触发提交，不用表单默认提交。

```tsx
import { useState } from 'react'
import { Button, TextField } from '@white55/a2ui-ui'

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim()) return
    onSend(value)
    setValue('')
  }

  return (
    <div className="chat-input">
      <TextField value={value} placeholder="生成一个订单卡片…" onChange={setValue} />
      <Button variant="primary" disabled={disabled || !value.trim()} onClick={submit}>
        发送
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: 创建 `src/chat/Sidebar.tsx`**

```tsx
import type { ReactNode } from 'react'

export function Sidebar({ children }: { children: ReactNode }) {
  return <aside className="chat-sidebar">{children}</aside>
}
```

- [ ] **Step 5: 创建 `src/chat/ChatPage.tsx`**

左右两栏用 Flexbox。右侧渲染 `A2uiSurface`，每个 surface 一个。

```tsx
import { A2uiSurface } from '../a2ui/protocol'
import { useChat } from './useChat'
import { Sidebar } from './Sidebar'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import './ChatPage.css'

export function ChatPage() {
  const { messages, surfaces, send, sending } = useChat()

  return (
    <div className="chat-page">
      <Sidebar>
        <h1 className="chat-title">A2UI 测试</h1>
        <MessageList messages={messages} />
        <ChatInput onSend={send} disabled={sending} />
      </Sidebar>
      <main className="chat-surface">
        {surfaces.length === 0 ? (
          <p className="chat-surface__empty">等待生成…</p>
        ) : (
          surfaces.map((surface) => (
            <A2uiSurface key={surface.id} surface={surface} />
          ))
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 6: 创建 `src/chat/ChatPage.css`**

```css
.chat-page {
  display: flex;
  height: 100vh;
  background: var(--a2ui-color-background);
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--leo-space-3);
  width: 360px;
  flex-shrink: 0;
  padding: var(--leo-space-4);
  border-right: 1px solid var(--a2ui-color-border);
  box-sizing: border-box;
}

.chat-title {
  margin: 0;
  font-size: 18px;
  color: var(--a2ui-color-on-surface);
  font-family: var(--a2ui-font-family-title);
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: var(--leo-space-2);
  flex: 1;
  overflow-y: auto;
}

.chat-empty {
  margin: 0;
  font-size: 13px;
  color: var(--a2ui-color-on-surface);
  opacity: 0.6;
}

.chat-message {
  padding: var(--leo-space-2) var(--leo-space-3);
  border-radius: var(--a2ui-border-radius);
  font-size: 14px;
  line-height: 1.5;
  max-width: 100%;
  word-break: break-word;
}

.chat-message--user {
  align-self: flex-end;
  background: var(--a2ui-color-primary);
  color: var(--a2ui-color-on-primary);
}

.chat-message--assistant {
  align-self: flex-start;
  background: var(--a2ui-color-surface);
  box-shadow: inset 0 0 0 1px var(--a2ui-color-border);
  color: var(--a2ui-color-on-surface);
}

.chat-input {
  display: flex;
  flex-direction: column;
  gap: var(--leo-space-2);
}

.chat-surface {
  display: flex;
  flex-direction: column;
  gap: var(--leo-space-4);
  flex: 1;
  overflow-y: auto;
  padding: var(--leo-space-4);
  box-sizing: border-box;
}

.chat-surface__empty {
  margin: 0;
  font-size: 14px;
  color: var(--a2ui-color-on-surface);
  opacity: 0.5;
}
```

- [ ] **Step 7: 更新 `src/app/App.tsx`**

```tsx
import { ChatPage } from '../chat/ChatPage'

export function App() {
  return <ChatPage />
}
```

- [ ] **Step 8: 运行 `pnpm --filter @white55/a2ui typecheck`**

预期：通过。

- [ ] **Step 9: 启动并确认布局**

Run: `pnpm --filter @white55/a2ui dev:vite`，浏览器打开 `http://localhost:5173/a2ui/`

预期：左右两栏；左侧有标题、空状态提示、输入框和发送按钮；右侧显示「等待生成…」。窗口宽度缩小到 900px 以下时两栏被挤压但不溢出（本任务不实现窄屏堆叠，留给后续）。

- [ ] **Step 10: 提交**

```bash
git add packages/a2ui/src
git commit -m "feat(a2ui): 实现 SSE 消费与聊天式布局"
```

---

### Task 10: 本地 mock 后端

**Files:**
- Create: `packages/a2ui/src/mock/fixtures.ts`
- Create: `packages/a2ui/src/mock/middleware.ts`
- Modify: `packages/a2ui/vite.config.ts`

**Interfaces:**
- Consumes: `CATALOG_ID`（Task 8）
- Produces: dev 环境下可用的 `POST /api/chat`（SSE）与 `POST /api/action`（204）

- [ ] **Step 1: 创建 `src/mock/fixtures.ts`**

覆盖纯 basic 组合与自定义组件两条路径，并包含一次增量更新。

```ts
import type { A2uiMessage } from '../a2ui/protocol'
import { CATALOG_ID } from '../a2ui/catalog'

const SURFACE_ID = 'main'

export const mockMessages: A2uiMessage[] = [
  { version: 'v0.9', createSurface: { surfaceId: SURFACE_ID, catalogId: CATALOG_ID } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [
        { id: 'root', component: 'Column', children: ['title', 'stats', 'orders'] },
        { id: 'title', component: 'Text', text: '生产绩效', variant: 'h1' },
        {
          id: 'stats',
          component: 'Chart',
          kind: 'bar',
          height: 260,
          data: { path: '/outputByArea' },
          xField: 'area',
          series: [
            { field: 'actual', label: '实际' },
            { field: 'planned', label: '计划', color: '#c5cfe0' },
          ],
          showValueLabel: true,
        },
        { id: 'orders', component: 'OrderCard', orderNo: { path: '/order/no' }, amount: { path: '/order/amount' }, onView: { event: { name: 'view-order' } } },
      ],
    },
  },
  {
    version: 'v0.9',
    updateDataModel: {
      surfaceId: SURFACE_ID,
      path: '/',
      value: {
        order: { no: 'SVPC-PRO-2410', amount: 128.5 },
        outputByArea: [
          { area: 'A 区', actual: 6420, planned: 6845 },
          { area: 'B 区', actual: 5880, planned: 6189 },
          { area: 'C 区', actual: 4260, planned: 4532 },
          { area: '精加工', actual: 1900, planned: 2114 },
        ],
      },
    },
  },
]

// 增量更新：只改标题，验证「不重建整棵树」
export const incrementalMessages: A2uiMessage[] = [
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [{ id: 'title', component: 'Text', text: '今天的生产绩效', variant: 'h1' }],
    },
  },
]
```

- [ ] **Step 2: 创建 `src/mock/middleware.ts`**

只在 dev 挂载。生产构建没有这个中间件，页面会走 `useChat` 的 catch 分支给出提示。

```ts
import type { Connect, Plugin } from 'vite'
import { CATALOG_VERSION } from '../a2ui/catalog'
import { incrementalMessages, mockMessages } from './fixtures'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function chatHandler(): Connect.NextHandleFunction {
  return async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-A2UI-Version', CATALOG_VERSION)
    res.setHeader('X-A2UI-Hash', 'dev')

    const all = [...mockMessages, ...incrementalMessages]
    for (const message of all) {
      res.write(`data: ${JSON.stringify(message)}\n\n`)
      await sleep(80)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  }
}

const actionHandler: Connect.NextHandleFunction = (req, res) => {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk
  })
  req.on('end', () => {
    console.info('[a2ui mock] action', body)
    res.statusCode = 204
    res.end()
  })
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'a2ui-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/chat', chatHandler())
      server.middlewares.use('/api/action', actionHandler)
    },
  }
}
```

- [ ] **Step 3: 更新 `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mockApiPlugin } from './src/mock/middleware'

export default defineConfig({
  base: '/a2ui/',
  plugins: [react(), mockApiPlugin()],
  build: {
    outDir: '../../dist-vite/a2ui',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 4: 端到端验证**

Run: `pnpm --filter @white55/a2ui dev:vite`，打开 `http://localhost:5173/a2ui/`，在输入框输入任意文本并点击「发送」。

预期：
1. 左侧出现用户消息与「已生成界面」
2. 右侧依次渲染标题、柱状图（4 个分类、2 个系列、数值标签）、订单卡片
3. 最终标题变为「今天的生产绩效」（增量更新生效）
4. 浏览器控制台无报错

- [ ] **Step 5: 验证 action 回传**

在渲染出的订单卡片上点击「查看」。

预期：
1. 控制台输出 `[a2ui] action { name: 'view-order', ... }`
2. 终端输出 `[a2ui mock] action ...`
3. 页面状态不变（mock 不回发新消息）

- [ ] **Step 6: 生产构建验证 mock 不被打包**

Run: `pnpm --filter @white55/a2ui build:vite`

预期：构建成功。`dist-vite/a2ui` 下生成产物。`grep -c "a2ui-mock-api" dist-vite/a2ui/assets/*.js` 结果为 0（插件名为构建期标识，不会进入运行时产物）。

- [ ] **Step 7: 提交**

```bash
git add packages/a2ui
git commit -m "feat(a2ui): 增加本地 SSE mock 后端"
```

---

### Task 11: 根脚本、Typecheck 接入与 React 版本统一

**Files:**
- Modify: `package.json`（根）
- Modify: `packages/react-vue-migration-demo/package.json`
- Modify: `pnpm-lock.yaml`（由 `pnpm install` 生成）

**Interfaces:**
- Consumes: 三个新包（Task 1~10）
- Produces: `pnpm dev:a2ui`、`pnpm build:a2ui`、`pnpm typecheck` 覆盖新包

- [ ] **Step 1: 修改根 `package.json` 的 `scripts`**

在 `"build:ui"` 之后新增两项，**不改动** `dev:vite` 与 `build:vite`：

```json
"dev:a2ui": "pnpm --filter @white55/a2ui dev:vite",
"build:a2ui": "pnpm --filter @white55/a2ui build:vite"
```

- [ ] **Step 2: 修改根 `package.json` 的 `typecheck`**

追加三个新包的类型检查。`@white55/a2ui` 分两条：一条查应用源码（用包内 `typecheck` 脚本），一条查 Vite 配置（用独立的 `tsconfig.config.json`，与 `apps/web` 的做法一致）。

```json
"typecheck": "pnpm --filter @white55/web typecheck && pnpm --filter @white55/low-code typecheck && pnpm --filter @white55/web exec vue-tsc --noEmit -p ../../packages/ui-playground/tsconfig.json && pnpm --filter @white55/a2ui-catalog exec tsc --noEmit && pnpm --filter @white55/a2ui-ui exec tsc --noEmit && pnpm --filter @white55/a2ui typecheck && pnpm --filter @white55/a2ui exec tsc --noEmit -p tsconfig.config.json"
```

- [ ] **Step 3: 修改 `packages/react-vue-migration-demo/package.json`**

`react`、`react-dom`、`@types/react` 改为 `19.2.8`；`@types/react-dom` 改为 `19.2.7`（该类型包无 `19.2.8`）。

```diff
- "react": "19.3.0",
- "react-dom": "19.3.0",
+ "react": "19.2.8",
+ "react-dom": "19.2.8",
```

```diff
- "@types/react": "19.3.0",
- "@types/react-dom": "19.3.0",
+ "@types/react": "19.2.8",
+ "@types/react-dom": "19.2.7",
```

- [ ] **Step 4: 运行 `pnpm install`**

预期：安装成功；`pnpm-lock.yaml` 更新；`node_modules` 中只有一份 `react@19.2.8`。

验证：`pnpm list -r react --depth 0`，预期所有包都显示 `19.2.8`。

- [ ] **Step 5: 运行 `pnpm check:vite`**

预期：`Vite 版本一致：6.0.11`。

- [ ] **Step 6: 运行 `pnpm typecheck`**

预期：全部通过。若 `react-vue-migration-demo` 因降版报错，检查是否用到了 19.3 新增 API；该包只用基础 hooks，预期不受影响。

- [ ] **Step 7: 运行 `pnpm lint`**

预期：通过。若新包有 lint 报错，修复后重跑。

- [ ] **Step 8: 提交**

```bash
git add package.json packages/react-vue-migration-demo/package.json pnpm-lock.yaml
git commit -m "build: 接入 a2ui 脚本并统一 React 版本到 19.2.8"
```

---

### Task 12: 包规则文件与最终验证

**Files:**
- Verify: `packages/a2ui-catalog/AGENTS.md`（Task 1）
- Verify: `packages/a2ui-ui/AGENTS.md`（Task 3）
- Verify: `packages/a2ui/AGENTS.md`（Task 7）
- Modify: 根 `AGENTS.md`（若需要新增工作区域路由）

**Interfaces:**
- Consumes: 全部前置任务
- Produces: 可交付的完整实现

- [ ] **Step 1: 检查根 `AGENTS.md` 的工作区域路由**

Run: `grep -n "packages/\*\*\|工作区域入口" AGENTS.md`

预期：根规则已用 `packages/**` 通配，无需为三个新包单独登记。若规则写死列举了具体包名，追加三项。

- [ ] **Step 2: 运行完整检查**

Run: `pnpm check:vite && pnpm typecheck && pnpm lint`

预期：三步全部通过。

- [ ] **Step 3: 运行生产构建**

Run: `pnpm build:a2ui`

预期：构建成功，产物在 `dist-vite/a2ui`。

- [ ] **Step 4: 验证子路径形态**

Run: `grep -o 'src="[^"]*"' dist-vite/a2ui/index.html | head -3`

预期：资源路径以 `/a2ui/` 开头，而非 `/a2ui/a2ui/`。

- [ ] **Step 5: 最终人工检查**

启动 `pnpm dev:a2ui`，确认：
1. 地址是 `http://localhost:5173/a2ui/`
2. 发送消息后右侧渲染出图表与卡片
3. 图表颜色与左侧按钮同色系（验证 token 映射生效）
4. 控制台手动执行 `document.documentElement.setAttribute('data-theme','dark')`，页面与图表同时变暗
5. 点击卡片「查看」，控制台出现 action 日志

- [ ] **Step 6: 使用 no-grid 检查**

Run: `grep -rn "display:\s*grid\|grid-template\|grid-column\|grid-row\|grid-area" packages/a2ui packages/a2ui-ui packages/a2ui-catalog --include="*.css" --include="*.tsx"`

预期：无输出。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "chore(a2ui): 完成包规则与最终验证"
```
