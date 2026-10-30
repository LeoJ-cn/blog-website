# Figma → Vue 3 + 私有组件库｜完整企业级落地方案 V1.0

技术路线已确定：Figma MCP + Code Connect CLI（`.figma.ts`）+ Codex Skills + Vue 3 + Playwright + PRD 业务集成。

这次以你实际的 `blog-website` Monorepo 为背景，并将设计师、前端、后端的职责贯穿整个流程。

核心目标不仅是把设计稿还原成 Vue 页面，而是建立一套公司可持续使用的开发流程：

- 设计师负责设计系统、页面状态、动态布局约束和交互规格。
- 前端负责私有组件库、Code Connect 映射、Vue UI、浏览器验证与业务前端集成。
- 后端负责接口契约、业务规则的服务端实现、权限和数据一致性。
- 产品负责业务需求定义和业务验收；测试负责质量验证。如果团队没有专职测试，这部分由前端承担，产品及设计参与验收。

## 一、最终架构与职责

公司 Figma Design System

设计师：组件、Variants、Tokens、Auto Layout

Code Connect CLI + `.figma.ts`

前端主责、设计师协作：真实组件和 Props 映射

Figma MCP + Codex + 私有 Vue 组件库

前端：视觉样式、动态布局、UI 交互与状态

Playwright 浏览器验证与修复

前端 / 测试主责，设计师验收视觉与交互

PRD + API + 业务集成

产品定义需求，后端实现接口，前端集成

UI + 业务回归验收

测试 / 前端执行，设计师和产品分别确认

### 全流程人员职责表

| 阶段                    | 主负责人       | 协作人员      | 主要交付物                         |
| --------------------- | ---------- | --------- | ----------------------------- |
| 01. 设计系统建设            | 设计师        | 前端        | Figma Library、Tokens、Variants |
| 02. 私有组件库准备           | 前端         | 设计师       | Vue 组件 API、主题、组件文档            |
| 03. Code Connect 环境配置 | 前端         | 设计师       | `figma.config.json`、CLI       |
| 04. `.figma.ts` 组件映射  | 前端         | 设计师       | 组件映射模板与代码片段                   |
| 05. 映射发布与验证           | 前端         | 设计师       | Figma Dev Mode / MCP 映射       |
| 06. 页面设计与交互交付         | 设计师        | 产品、前端     | 页面 Frames、状态和交互规格             |
| 07. Vue 页面与 UI 交互实现   | 前端         | 设计师       | Vue 页面、组件、Mock UI             |
| 08. 视觉验证与自动修复         | 前端 / 测试    | 设计师       | Playwright 测试、截图、缺陷记录         |
| 09. 业务需求与接口契约         | 产品、后端分别负责  | 前端        | PRD、OpenAPI、字段及权限规则           |
| 10. 前后端业务集成           | 前端、后端各负责本端 | 产品        | API 集成、Store、业务状态和测试          |
| 11. 综合验收与上线           | 测试 / 前端    | 设计师、产品、后端 | 回归报告、发布记录                     |

开发责任和验收责任应当分开。 例如，前端实现了按钮样式，不代表前端可以自行决定它在业务上是否应该允许点击；设计师定义了交互状态，也不代表设计师负责数据库事务。

## 二、你现有的工具，哪些保留、哪些安装？

| 工具                                      | 当前状态     | 处理            |
| --------------------------------------- | -------- | ------------- |
| Codex CLI                               | 已安装      | 保留            |
| `figma_8359` / `figma_leoj` MCP         | 已配置      | 保留            |
| `figma` Skill                           | 已安装      | 直接使用          |
| `figma-code-connect-components`         | 已安装      | 辅助识别组件及生成映射   |
| `figma-create-design-system-rules`      | 已安装      | 生成项目设计规则      |
| `figma-implement-design`                | 已安装      | 页面实现          |
| Vue 系列 Skills                           | 已安装      | 组件、路由、状态与测试规范 |
| `playwright` / `playwright-interactive` | 已安装      | 浏览器验证         |
| Superpowers                             | 已安装      | 排障、测试、完成前验证   |
| `@figma/code-connect`                   | 尚未确认安装   | 本方案必须安装       |
| Playwright Test                         | 尚未确认项目依赖 | 检查后按需安装       |

这次 `@figma/code-connect` 必须安装，是因为你明确要求使用 CLI 管理 `.figma.ts` 文件，并将映射正式发布到 Figma。

Skill 负责指导 Codex 编写映射；CLI 负责解析、预览、验证、发布和撤销映射。官方目前推荐 Template 文件方案，不再推荐新项目采用旧式框架 Parser。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs+1



## 三、工程目录与文件职责

### 3.1 推荐目录

长期方案：Code Connect 文件优先放在私有组件库的维护仓库。 因为组件映射属于设计系统资产，而不是某一个业务页面的资产。

如果公司组件库只有私有 npm 包，你暂时无法访问源码仓库，可以先在 `blog-website/packages/ui` 中配置，等具备组件库仓库权限后再迁移。

以下是目前可以直接使用的项目级方案：

```
blog-website/
└── packages/
    └── ui/
        ├── AGENTS.md
        ├── package.json
        ├── figma.config.json
        ├── tsconfig.figma.json
        │
        ├── code-connect/
        │   ├── Button.figma.ts
        │   ├── Input.figma.ts
        │   ├── Select.figma.ts
        │   ├── Dialog.figma.ts
        │   └── Table.figma.ts
        │
        ├── docs/
        │   ├── ai/
        │   │   └── component-guide.md
        │   ├── pages/
        │   │   └── dropbox-home.ui.md
        │   └── requirements/
        │       └── dropbox.md
        │
        ├── .figma/
        │   ├── source.yaml
        │   ├── fetch.sh
        │   ├── raw/
        │   ├── assets/
        │   └── interactions.yaml
        │
        ├── src/
        │   └── ...  # 现有 Vue 工程
        │
        ├── tests/
        │   └── ...  # 现有测试目录
        │
        └── .artifacts/
            └── ui-verify/
                └── ...  # 实际截图及报告
```

### 3.2 每个文件的职责

| 文件                        | 负责人           | 内容                    |
| ------------------------- | ------------- | --------------------- |
| `AGENTS.md`               | 前端            | AI 开发规则、组件优先级、禁止事项    |
| `figma.config.json`       | 前端            | Code Connect CLI 项目配置 |
| `tsconfig.figma.json`     | 前端            | `.figma.ts` 的类型检查配置   |
| `code-connect/*.figma.ts` | 前端主责、设计协作     | Figma 组件与 Vue 组件映射    |
| `component-guide.md`      | 前端            | 私有组件 API、封装、使用示例      |
| `docs/pages/*.ui.md`      | 设计师、前端        | 响应式、内容溢出、滚动及 UI 交互规格  |
| `docs/requirements/*.md`  | 产品、后端、前端      | 业务规则与接口约定             |
| `src/`                    | 前端            | 页面与业务前端代码             |
| `tests/`                  | 前端 / 测试       | 自动化验证                 |
| `.artifacts/`             | Codex 生成、前端审核 | 截图、测试证据及验收报告          |

你已经生成的 `.figma/raw` 数据继续保留，但不再要求每个页面先执行 REST 采集。

# 四、阶段 01：设计师建设 Figma Design System

主责：设计师

协作：前端；产品确认交互行为

这是后面 Code Connect 可以准确工作的前提。

## 4.1 设计师必须交付什么？

| 设计资产                 | 设计师的具体工作                               | 前端参与什么                   |
| -------------------- | -------------------------------------- | ------------------------ |
| Component Library    | 建立 Button、Input、Dialog 等组件，并发布         | 确认是否存在对应的代码组件            |
| Variants             | Primary、Secondary、Small、Large 等状态      | 确认是否能映射到真实 Props         |
| Component Properties | 文本、Boolean、Instance Swap 等             | 确认命名与组件 API 的关系          |
| Design Tokens        | 颜色、字号、间距、圆角等变量                         | 对应 CSS Variables / Theme |
| Auto Layout          | Hug、Fill、Fixed、间距、约束                   | 判断 Flex/Grid 和动态尺寸策略     |
| UI States            | Default、Hover、Focus、Disabled、Loading 等 | 确认组件能否实现                 |
| Prototype            | 点击、悬停、弹窗和状态跳转                          | 实现 UI 交互                 |
| 响应式规格                | 桌面窄屏、超宽屏、内容溢出处理                        | 转换为具体 CSS 行为             |

Figma 官方也建议使用组件、变量、Auto Layout、明确的图层命名和设计标注来提高代码生成质量。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs



## 4.2 设计稿不能只交付一张截图

比如 Button 组件，设计师至少应该明确：

| 项目       | 设计定义               |
| -------- | ------------------ |
| 默认宽度     | Hug Contents，按内容撑开 |
| 最小宽度     | 公司设计规范决定           |
| 最大宽度     | 由具体使用场景决定          |
| 长文本      | 换行、截断或限制按钮宽度       |
| Loading  | 是否替换图标，是否禁用点击      |
| Disabled | 颜色、鼠标与焦点行为         |
| Hover    | 背景或边框变化            |
| 移动端      | 是否允许整行显示           |

不能一律把 Figma 截图中看到的宽度当成固定 CSS 宽度。

### 阶段交付

设计师： 发布可复用的 Figma Library，交付组件属性、样式变量、交互状态和动态布局规则。

前端： 检查公司私有组件库是否能覆盖这些设计组件。

验收条件： Figma 中真实存在可复用、已发布的组件，双方确认设计与代码组件对应关系。

# 五、阶段 02：前端准备私有组件库

主责：前端

协作：设计师确认视觉规范

## 5.1 先确保组件库能正常使用

进入项目：

```
cd ~/Documents/company/blog-website/packages/ui
```

查看依赖：

```
pnpm list --depth 0
```

查看项目现有组件使用方式：

```
rg -n '^import .* from ' src --glob '*.vue' --glob '*.ts'
```

需要核实的不是仅仅有没有安装组件库，而是：

- 有无 TypeScript 类型声明；
- 是否存在组件文档或 Storybook；
- Props、Events、Slots 是否完整；
- 项目已有的二次封装是什么；
- 公司组件是否支持 CSS Variables、主题和动态尺寸；
- 能否通过公开 API 实现 Figma 的设计状态。

如果私有组件库尚未安装成功，应先解决公司私有 npm Registry 的访问权限。不要让 Codex 自行替换成公开 UI 库。

## 5.2 用 Codex 生成组件说明

使用已有 `$vue-best-practices`：

```
使用 $vue-best-practices。

只读分析当前项目的公司私有组件库及已有二次封装。

输出 docs/ai/component-guide.md。

要求：
1. 查找实际组件导入路径。
2. 提取真实 Props、Events、Slots、类型定义。
3. 查找 Design Tokens、CSS Variables、主题规则。
4. 确定项目二次封装与基础组件的关系。
5. 列出 Button、Input、Select、Dialog、Table 等实际存在的组件。
6. 为每个组件记录真实使用示例。
7. 记录不支持的设计能力。

不得猜测组件 API，不修改组件库代码。
```

组件库的源码或文档若只能通过受限内网访问，必须在公司授权范围内提供给 Codex。

## 5.3 使用设计规则 Skill

```
使用 $figma-create-design-system-rules。

读取当前 AGENTS.md、组件库使用指南、
项目 Vue 3 技术栈、现有设计变量及组件规范。

更新项目设计规则：

项目已有二次封装 > 公司组件库 >
基于公司组件二次封装 > 新增组件。

要求：
- 不重复实现基础 UI 组件。
- 不猜测 Props、Events、Slots。
- 优先使用 Design Tokens。
- 保留组件的动态尺寸与交互能力。
- 未经批准不修改公司基础组件。
- 不破坏项目已有规则。
```

### 阶段交付

`docs/ai/component-guide.md` 和经过更新的 `AGENTS.md`。

验收条件： Codex 能根据真实代码正确导入私有 Button、Input、Dialog，并说明它们的属性及封装关系。

# 六、阶段 03：安装并配置 Code Connect CLI

主责：前端

协作：设计师提供 Figma Library 权限

## 6.1 确认 Figma 账户权限

根据当前官方要求，Code Connect CLI 需要：

- Node.js 18 及以上；
- Professional、Organization 或 Enterprise 对应的 Dev / Full 席位；
- Figma Personal Access Token：`Code Connect Write`、`File Content Read`；
- 对目标组件库拥有适当访问权限。

Professional 套餐目前限制为一个活跃设计 Library 和一个活跃框架。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs



你已经配置了 `figma_8359`，但是需要明确区分：

| 凭据                     | 用途                         |
| ---------------------- | -------------------------- |
| `figma_8359` OAuth MCP | Codex 读取设计上下文              |
| `FIGMA_TOKEN_8359`     | Figma REST / CLI API       |
| `FIGMA_ACCESS_TOKEN`   | Code Connect CLI 默认读取的环境变量 |

它们可以对应同一个 Figma 账号，但 MCP OAuth 成功不代表 PAT 具有发布权限。

## 6.2 安装精确版本

先查看当前发布版本：

```
npm view @figma/code-connect version
```

选择经过确认的版本后设置变量，下面的版本值需要替换为你实际确定的版本：

```
FIGMA_CC_VERSION="填入已确认的版本号"
```

安装在映射工程所在包：

```
pnpm add -D -E "@figma/code-connect@$FIGMA_CC_VERSION"
```

这里使用 `-E` 精确锁定，不使用 `^`、`~` 或 `--force`。

验证安装：

```
pnpm exec figma connect --version
```

按你的工程规范，安装后还应更新 `docs/DEPENDENCIES.md`，记录实际版本、用途及升级依据。

## 6.3 配置 CLI 使用现有 Token

如果 `FIGMA_TOKEN_8359` 已在当前终端：

```
export FIGMA_ACCESS_TOKEN="${FIGMA_TOKEN_8359:-}"
```

如果 Token 保存在 macOS Keychain：

```
export FIGMA_ACCESS_TOKEN="$(security find-generic-password -a "$USER" -s FIGMA_TOKEN_8359 -w)"
```

二选一即可，不需要两种都执行。

验证变量存在：

```
test -n "${FIGMA_ACCESS_TOKEN:-}" && echo "Token OK"
```

如果 Token 缺少 Code Connect Write 权限，需要在 Figma 重新创建具有适当权限的 PAT，而不是将实际 Token 直接写入仓库。

## 6.4 创建 `figma.config.json`

在 `packages/ui` 下创建：

```
{
  "codeConnect": {
    "include": ["code-connect/**/*.figma.ts"],
    "label": "Vue",
    "language": "html"
  }
}
```

配置说明：

| 字段         | 作用                      |
| ---------- | ----------------------- |
| `include`  | 指定需要解析的 `.figma.ts` 文件  |
| `label`    | Figma Dev Mode 中显示的框架名称 |
| `language` | 代码片段语法高亮语言              |

Vue 使用 HTML 语法的组件模板，因此 `label: "Vue"`、`language: "html"` 是合适的组合。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs



## 6.5 配置 TypeScript 类型

建议创建独立的 `tsconfig.figma.json`，避免改变原有 Vue 应用的 TS 配置：

```
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": [
      "@figma/code-connect/figma-types"
    ],
    "noEmit": true
  },
  "include": [
    "code-connect/**/*.figma.ts"
  ]
}
```

如果原 `tsconfig.json` 已经声明了其他必要的 `types`，需要按实际项目补充，不能直接丢失它们。

注意：`.figma.ts` 中的 `import figma from 'figma'` 是 Code Connect Template API 的约定，并不意味着你需要额外安装名为 `figma` 的 npm 包。

### 阶段交付

`figma.config.json`、`tsconfig.figma.json`、锁定版本的 `@figma/code-connect`。

验收条件： CLI 能运行，Token 已具备必要权限，项目配置正确。

# 七、阶段 04：编写 `.figma.ts` 组件映射

主责：前端

设计师提供组件链接、Variants 和属性含义

这是整套流程中，设计系统与真实代码真正打通的一步。

## 7.1 工作流程

设计师

提供 Button 主组件 URL、属性定义、Variants

前端 + Codex

核对私有 Button API，生成 `.figma.ts`

前端审核

预览不同 Variants，确认最终 Vue 代码

## 7.2 先自动生成模板

设计师在 Figma Library 中右键 Button 主组件，选择 Copy link to selection。

然后在 CLI 中执行：

```
pnpm exec figma connect create \
  "https://www.figma.com/design/你的组件库FileKey/Design-System?node-id=组件ID" \
  --outDir code-connect
```

这里必须填写公司的真实 Figma 组件 URL，不是 Dropbox 首页 URL。

CLI 会根据组件属性生成一个初始 `.figma.ts` 文件，但其 `example` 和 `imports` 需要前端完善。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs



## 7.3 `.figma.ts` 的完整示例

假设公司 Vue 组件真实 API 如下：

```
<CompanyButton
  size="md"
  :disabled="false"
>
  Create
</CompanyButton>
```

假设 Figma 属性为：

- `Label`
- `Size`：Small、Medium、Large
- `Disabled`：Boolean

那么模板可以写成：

```
// url=https://www.figma.com/design/FIGMA_LIBRARY_KEY/Design-System?node-id=123-456
// component=CompanyButton

// figma：Code Connect Template API，读取 Figma 组件实例的属性。
// 该模块由 Code Connect CLI 提供解析环境。
import figma from 'figma'

// selectedInstance：当前被渲染的 Figma 组件实例。
const instance = figma.selectedInstance

// getString：读取 Figma 的文本属性，返回 string。
const label = instance.getString('Label')

// getEnum：读取 Figma 枚举属性，并映射为真实 Vue Props 值。
const size = instance.getEnum('Size', {
  Small: 'sm',
  Medium: 'md',
  Large: 'lg',
})

// getBoolean：读取布尔属性，返回 boolean。
const disabled = instance.getBoolean('Disabled')

export default {
  // 根据当前实例属性，生成对应的 Vue 组件使用片段。
  example: figma.code`
    <CompanyButton
      size="${size}"
      :disabled="${disabled}"
    >
      ${label}
    </CompanyButton>
  `,

  // 映射为真实私有组件库的导入路径。
  imports: [
    "import { CompanyButton } from '@company/ui'",
  ],

  // 此模板的稳定标识。
  id: 'company-button-vue',
}
```

以上 Figma URL、`CompanyButton`、`@company/ui` 以及属性名称均为示例，必须根据真实设计系统与私有组件库替换。

这里使用的是官方推荐的 `.figma.ts` + `figma.code` Template API，不是旧式 `.figma.tsx` + `figma.connect()`。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs+1



需要注意，Code Connect Template 主要生成代码片段，本身不运行你的 Vue 组件。因此还必须通过真实类型检查和组件测试确认代码片段可用。

## 7.4 用现有 Skill 批量辅助生成映射

在 Codex 中执行：

```
使用 $figma-code-connect-components 和 $figma。

本次明确采用 Code Connect CLI Template 方案。

Figma MCP：figma_8359
组件库：当前项目实际私有 Vue 组件库
目标 Figma：<公司 Design System URL>

任务：
1. 获取 Design System 已发布组件。
2. 查找真实代码组件及已有二次封装。
3. 提取 Figma Properties、Variants。
4. 生成 code-connect/*.figma.ts。
5. 使用 import figma from 'figma'。
6. 使用 figma.selectedInstance 和 figma.code。
7. 正确映射 Props 和 Slots。
8. 导入路径必须基于真实组件 API。
9. 不使用 .figma.tsx 或 figma.connect()。
10. 不调用 send_code_connect_mappings 代替 CLI 发布。

先生成模板，不执行 publish。
输出无法映射或有歧义的组件清单。
```

如果你当前 `figma-code-connect-components` Skill 更偏向于 MCP 映射提交，而不是文件生成，要求 Codex遵循官方 [figma-code-connect Template Skill](https://github.com/figma/mcp-server-guide/blob/main/skills/figma-code-connect/SKILL.md?utm_source=chatgpt.com) 的规则生成文件即可；不必同时建立两套映射。

## 7.5 验证每个 Variant

先检查 Figma 组件有哪些属性：

```
pnpm exec figma connect preview \
  code-connect/Button.figma.ts --inspect
```

预览默认代码：

```
pnpm exec figma connect preview \
  code-connect/Button.figma.ts
```

查看不同状态：

```
pnpm exec figma connect preview \
  code-connect/Button.figma.ts --all --max-combinations 20
```

这里应重点确认：

| Figma 属性        | 生成的 Vue 值          | 是否匹配 |
| --------------- | ------------------ | ---- |
| Small           | `size="sm"`        | 必须核对 |
| Medium          | `size="md"`        | 必须核对 |
| Large           | `size="lg"`        | 必须核对 |
| Disabled = true | `:disabled="true"` | 必须核对 |
| Label           | 默认 Slot 内容         | 必须核对 |

不能只测试默认状态。

最后解析全部模板：

```
pnpm exec figma connect parse
```

CLI 的 `preview --inspect`、`--all`、`--props` 和 `parse` 均为官方支持的命令。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs



### 阶段交付

`code-connect/*.figma.ts`，每个组件具有实际映射依据和经过预览的代码片段。

前端审核代码 API，设计师确认 Figma 属性与组件意图。

# 八、阶段 05：Code Connect 正式发布与 MCP 验证

主责：前端

设计师协作；公司组件库负责人审核

## 8.1 发布前检查

先运行 Dry Run：

```
pnpm exec figma connect publish --dry-run
```

发布前还应该检查：

- Figma Node URL 是否为公司的正式组件；
- Vue 组件导入路径是否真实；
- Props 和 Variants 是否正确；
- 代码片段是否包含公司敏感信息；
- 是否覆盖已有团队映射；
- Figma Token 是否具有发布权限。

如果与 Figma UI 创建的映射发生冲突，应先核实并决定迁移方式，不要直接使用 `--force` 覆盖。

Code Connect CLI 会向 Figma 提交组件路径、仓库信息及 `.figma.ts` 中的代码和属性信息，因此私有代码片段需要经过公司的发布审批。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs



## 8.2 正式发布

建议首先只发布一个经过审核的 Button：

```
pnpm exec figma connect publish \
  --file code-connect/Button.figma.ts
```

在 Figma Dev Mode 确认正确后，再发布整个映射集合：

```
pnpm exec figma connect publish \
  --exit-on-unreadable-files
```

如果需要回滚，可以使用官方 `figma connect unpublish`，先运行 `--dry-run`，确认目标后再执行撤销。不要删除源码文件就假设线上映射已经消失。

## 8.3 用 MCP 验证结果

在 Codex 中执行：

```
使用 $figma。

通过 figma_8359 MCP：

1. 读取已建立 Code Connect 映射的公司 Button 实例。
2. 调用 get_code_connect_map。
3. 检查 Vue 框架的映射。
4. 调用 get_design_context。
5. 检查 CodeConnectSnippet。

输出：
- Figma Node ID
- componentName
- source
- snippet
- import
- label
- 与私有组件库 API 的一致性

不修改代码。
```

发布成功后，Figma MCP 能在对应实例的设计上下文中提供 Code Connect 代码片段和导入信息。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs



### 阶段验收

&#x20;设计师能在 Figma Dev Mode 查看正确的 Vue 组件用法。

&#x20;前端可以通过 MCP 读取映射，并验证生成的组件导入路径及属性。

如果返回的仍然是 React / Tailwind 设计表示，不一定代表 Code Connect 失效；需要检查目标是否为已映射的组件实例、Vue 框架是否处于活跃状态，以及 MCP 是否正确选择了该框架。

# 九、阶段 06：设计师正式交付页面与交互

主责：设计师

协作：前端、产品

Code Connect 建立以后，设计师开始为具体业务页面使用已发布的公司组件。

这一阶段有一个重要规则：

公司 Figma Library 的 Button 已经映射到公司 Vue Button，不代表从 Community 导入的任意 Button 都自动拥有该映射。

设计师应尽量在正式项目设计稿中使用公司的组件实例。

## 9.1 页面交付 Checklist

| 分类    | 设计师需要明确                      |
| ----- | ---------------------------- |
| 设计基准  | Frame 宽高、布局区域、字体和资源          |
| 组件使用  | 是否使用公司 Library 的组件实例         |
| 尺寸规则  | Fixed、Hug、Fill、Min/Max       |
| 长文本   | 换行、单行省略、多行截断                 |
| 内容数量  | 空数据、少量、大量的展示方式               |
| 滚动    | 页面滚动、内部滚动、固定元素               |
| 响应式   | 支持宽度、断点和重排策略                 |
| 交互    | 事件、目标状态、关闭和恢复                |
| 异常 UI | Loading、Empty、Error、Disabled |
| 动画    | 是否必要、时长、进入退出方式               |

需要特别区分：设计师负责交互的视觉与操作规格，业务操作是否允许、提交后真实数据如何变化，由产品和开发一起确认。

## 9.2 三方怎样完成交付？

设计师提供页面 Frame 和状态说明；产品说明功能意图；前端检查交互的可实现性及组件库覆盖情况。

对于设计稿没有说明的部分，前端可以建议实现方案，但不能把自己的推断伪装成设计已确认。

### 阶段交付

完整页面 Figma URL、关联状态、交互说明，以及关键动态布局约束。

# 十、阶段 07：前端使用 Codex 实现 Vue 页面与 UI 交互

主责：前端

协作：设计师验收视觉与交互

使用已有 Skills：

`figma`、`figma-implement-design`、`vue-best-practices`、涉及路由时使用 `vue-router-best-practices`。

## 10.1 组件选择优先级

| 优先级 | 来源                   | 处理方式               |
| --- | -------------------- | ------------------ |
| 1   | 已有项目二次封装             | API 兼容则优先使用        |
| 2   | Code Connect 映射的公司组件 | 按真实 Props、Slots 实现 |
| 3   | 公司组件库其他组件            | 查找可替代实现            |
| 4   | 公司组件的组合/二次封装         | 补充通用 UI 能力         |
| 5   | 新 Vue 组件             | 确认无法复用后创建          |

如果现有二次封装的行为和正式 Code Connect 映射冲突，不应机械地始终优先二次封装，而应该核对其适用范围和 API。

## 10.2 页面实现与业务逻辑如何解耦？

例如创建文件夹：

Vue UI 组件

Input、Dialog、Button、Loading、错误展示

页面 UI 事件

open、close、update:modelValue、create

Mock / 真实业务适配

第一阶段 Mock；第三阶段替换成真实 API

建议第一阶段定义稳定的 UI 契约：

```
// Vue：UI 组件对外公开的参数与事件类型。
// 类型均根据实际页面需要定义，不代表公司基础组件 API。

export interface CreateFolderDialogProps {
  open: boolean
  loading: boolean
  errorMessage?: string
}

export interface CreateFolderPayload {
  name: string
}
```

例如由弹窗组件发出 `create` 事件，页面容器接收后调用 Mock 或真实业务方法。

这样后端尚未完成接口时，前端依然可以完成完整 UI 验收。

## 10.3 Codex 执行指令

```
使用：
$figma
$figma-implement-design
$vue-best-practices

MCP：figma_8359
Figma：<本次完整页面 URL>

目标：在当前 Vue 3 + TypeScript 项目中实现页面。

准备：
1. 读取 AGENTS.md 和 component-guide.md。
2. 获取目标 Frame、设计截图、关联状态。
3. 通过 get_code_connect_map 查询组件映射。
4. 优先复用现有封装和公司私有组件。
5. 检查映射片段与真实组件类型是否一致。

页面：
1. 完成设计稿基础视觉。
2. 实现 Flex/Grid 与动态尺寸。
3. 补全长文本、溢出、省略和滚动。
4. 根据已确认规范实现响应式。
5. 实现 UI 交互、组件状态与弹窗流程。
6. 使用 Mock 数据完成演示。

约束：
- 不接真实业务 API。
- 不编造业务规则。
- 不重复实现基础组件。
- 不为了截图大量使用绝对定位。
- 不修改公司私有组件库源码。

交付可运行代码及 UI 状态清单。
列出未确认的设计行为。
```

### 阶段验收

UI 可以独立运行；关键视觉、动态内容、交互状态已经实现；代码使用了经过确认的公司组件。

# 十一、阶段 08：Playwright 验证、修复、复测

主责：前端 / 测试

设计师验收视觉和交互规格

你已经有 `$playwright` 和 `$playwright-interactive`，无须为了本流程再安装一个 Playwright MCP。

## 11.1 验证责任划分

| 检查项                    | 执行              | 验收          |
| ---------------------- | --------------- | ----------- |
| Figma 静态还原             | 前端 / Playwright | 设计师         |
| 动态宽高、长文本、滚动            | 前端 / Playwright | 前端、设计师      |
| 响应式                    | 前端 / Playwright | 设计师依据支持范围确认 |
| Modal、Dropdown 等 UI 交互 | 前端 / Playwright | 设计师         |
| 键盘与可访问性                | 前端 / 测试         | 前端 / 测试     |
| 组件类型与工程检查              | 前端              | 前端          |
| 视觉回归                   | 前端 / 测试         | 设计师         |

## 11.2 测试矩阵

| 类别  | 具体测试                         |
| --- | ---------------------------- |
| 视口  | 设计基准、窄桌面、矮视口、临界宽度            |
| 文本  | 空、短、长、无空格长串、中英文混排            |
| 数据量 | 0、1、少量、大量                    |
| 弹窗  | 打开、关闭、Esc、焦点恢复、内部滚动          |
| 导航  | Hover、Selected、Dropdown、路由变化 |
| 运行时 | Console Error、资源失败、异常        |
| 回归  | 修复后原视口和原交互重新测试               |

以你当前 Dropbox 的首页为例，静态视觉基准可以使用设计稿的 `1512 × 874` 视口；其他测试视口应根据产品的实际支持范围选择，而不是直接假设必须支持手机。

## 11.3 Codex 验证指令

```
使用：
$playwright
$vue-testing-best-practices
$superpowers:verification-before-completion

目标：对刚实现的 Vue 页面进行真实浏览器验收。

1. 读取实际开发启动命令、路由和 Figma 参考。
2. 启动真实页面。
3. 在设计稿视口截图。
4. 验证公司组件样式及设计视觉差异。
5. 验证长文本、内容撑开、截断与滚动。
6. 验证空数据、大量数据与局部溢出。
7. 验证支持的不同视口和临界宽度。
8. 测试 Modal、Dropdown、Input、键盘与焦点。
9. 检查 Console 和资源异常。
10. 定位真实缺陷并最小范围修复。
11. 每次修改后在相同条件下复测。
12. 运行现有类型检查、Lint、Build 和测试。

生成报告：
.artifacts/ui-verify/<page>/report.md

包含：
- 测试环境与视口
- 设计参考截图和浏览器截图
- 已发现和已修复问题
- 真实测试结果
- 未验证、待确认及剩余缺陷

不得仅凭静态代码检查宣称页面验收通过。
```

### 截图对比与自动修复的边界

Playwright 可以提供真实页面截图、DOM 信息、交互结果和错误日志，但不能单靠一次截图认定整个页面 100% 还原。

如需要量化视觉差异，还应建立稳定的截图基线并运行 Playwright Test 的视觉回归；基准图必须先获得设计师认可。

### 阶段交付

浏览器验收报告、截图、修复后的代码和可复用的关键测试。

# 十二、阶段 09：产品与后端交付业务需求

这一阶段建议并行开展，而不是前端 UI 完成后后端才开始设计 API。

产品：业务需求主责

后端：接口与服务端逻辑主责

## 12.1 三方职责

| 人员  | 必须负责                        |
| --- | --------------------------- |
| 产品  | 业务目标、功能范围、字段规则、用户流程、验收标准    |
| 设计师 | 业务 UI 状态、错误提示呈现、关键交互样式      |
| 前端  | 表单处理、接口调用、前端状态、权限呈现、错误反馈    |
| 后端  | API 契约、校验、鉴权、数据存储、事务、并发与一致性 |

## 12.2 业务文档需要哪些数据？

以新建文件夹为例：

| 项目    | 需要明确的业务问题                   |
| ----- | --------------------------- |
| 字段    | 文件夹名称最大长度多少？哪些字符不能使用？       |
| 权限    | 哪些用户可以创建？                   |
| 重名    | 同级文件夹允许同名吗？                 |
| 接口    | URL、Method、请求参数、响应 DTO 是什么？ |
| 状态    | 创建成功后列表如何更新？                |
| 异常    | 权限不足、重名、服务失败时怎么处理？          |
| 并发    | 重复点击或并发创建如何处理？              |
| 数据一致性 | 创建成功但列表刷新失败怎么办？             |

这些不能从 Figma 自动推断。

### 后端建议的交付物

对于现有项目，可以直接交付 API 文档或 OpenAPI/Swagger 定义，并明确：

- 请求与响应 DTO；
- HTTP 状态码和业务错误码；
- 认证授权方式；
- 分页、过滤和排序约定；
- 幂等性或并发要求；
- 测试环境及测试数据。

前端的按钮禁用和防重复点击只是体验控制，不能代替后端的权限、数据校验与并发处理。

# 十三、阶段 10：前端业务集成

前端：客户端业务主责

后端：API 及数据主责

## 13.1 推荐调用链

Vue UI 组件

展示 Props、触发 Emits

页面容器 / Composable / Pinia

业务状态、表单验证、提交编排

API Service

接口调用、DTO 适配、错误转换

后端 API / 数据库

鉴权、业务规则、持久化、一致性

这里不是要求所有页面必须使用 Pinia。局部弹窗状态可以留在组件内；跨页面共享且需要长期维护的业务状态，才考虑 Store。

## 13.2 业务集成的 Codex 指令

```
使用：
$vue-best-practices
$vue-pinia-best-practices（使用 Pinia 时）
$vue-router-best-practices（涉及路由时）
$vue-testing-best-practices

页面：<已完成 UI 的路由>
PRD：<业务文档>
API：<后端接口定义>

目标：在现有 UI 基础上实现真实业务。

1. 阅读完整 PRD 和 API 契约。
2. 列出 UI 事件与业务操作的映射关系。
3. 明确所有字段规则、权限和状态流转。
4. 复用现有 API Service、Composable、Store。
5. 将 Mock 数据替换为真实数据。
6. 实现 Loading、Success、Error、Empty。
7. 处理重复提交、请求异常、状态恢复。
8. 编写关键业务流程与异常分支测试。
9. 保留已完成的 UI 组件结构和视觉效果。
10. 报告接口缺失、规则歧义与未完成项。

不编造业务规则。
不绕过后端鉴权。
不擅自改变公司组件 API。
不对生产数据执行测试操作。
```

### 业务验收分工

产品： 确认功能是否满足 PRD。

后端： 确认 API、权限、数据库和服务端规则正确。

前端： 确认操作流程、状态反馈和 UI 集成正确。

# 十四、阶段 11：最终回归与交付

执行：前端 / 测试

设计师、产品、后端按职责确认

业务集成后，再次使用 Playwright 验证：

- 真实数据是否撑破布局；
- 请求期间是否正确显示 Loading；
- 错误文案是否引起溢出；
- 权限变化是否正确影响控件；
- 提交成功后列表是否刷新；
- 交互状态、焦点、弹窗和滚动是否回归正常；
- 原有 UI 测试是否继续通过。

## 最终验收矩阵

| 验收项          | 验收责任人       | 完成条件                     |
| ------------ | ----------- | ------------------------ |
| 设计系统组件一致性    | 设计师、前端      | 使用正确公司组件、Tokens          |
| Code Connect | 前端          | `.figma.ts` 已发布且 MCP 能读取 |
| 静态视觉         | 设计师         | 设计基准下主要差异符合验收要求          |
| 动态布局         | 前端、设计师      | 长文本、滚动、数据量变化符合规格         |
| UI 交互        | 设计师、前端 / 测试 | 关键交互路径通过                 |
| 业务规则         | 产品          | PRD 验收条件满足               |
| API 与服务端     | 后端          | 接口、权限、校验和数据一致性通过         |
| 前后端集成        | 前端、后端       | 真实数据流程及异常处理通过            |
| 自动化测试        | 前端 / 测试     | 关键场景可重复执行                |
| 上线交付         | 项目负责人       | 无阻塞缺陷，剩余问题已记录            |

# 十五、把这些步骤固化成日常工作流

实际开始工作时，不需要每次从第 01 步重新执行。

## 一次性建设

| 顺序 | 任务                     | 主负责人 | 何时执行         |
| -- | ---------------------- | ---- | ------------ |
| 1  | 公司 Figma Library 与组件规范 | 设计师  | 首次及设计系统升级时   |
| 2  | 私有组件库和组件指南             | 前端   | 首次及组件库升级时    |
| 3  | CLI 安装与配置              | 前端   | 首次           |
| 4  | `.figma.ts` 映射及发布      | 前端   | 新增/修改设计系统组件时 |
| 5  | AGENTS.md 和测试规范        | 前端   | 首次及工程规范变化时   |

## 每个新页面

| 顺序 | 任务                | 主负责人     | 使用工具                     |
| -- | ----------------- | -------- | ------------------------ |
| 1  | Figma 页面交付        | 设计师      | Figma                    |
| 2  | 读取设计、Code Connect | 前端       | Figma MCP                |
| 3  | Vue 页面与纯 UI 交互    | 前端       | `figma-implement-design` |
| 4  | 视觉、动态布局、交互验证      | 前端 / 测试  | Playwright               |
| 5  | PRD 和接口交付         | 产品 / 后端  | PRD、OpenAPI              |
| 6  | 前后端业务集成           | 前端 / 后端  | Vue、API、测试               |
| 7  | 综合回归              | 前端 / 测试  | Playwright、自动化测试         |
| 8  | 视觉与业务签收           | 设计师 / 产品 | 验收报告                     |

# 十六、最终的 Code Connect CLI 使用清单

下面这些命令是你以后最常用的部分，全部在安装 Code Connect 的包根目录执行。

| 目的     | 命令                                                                                         |
| ------ | ------------------------------------------------------------------------------------------ |
| 检查 CLI | `pnpm exec figma connect --version`                                                        |
| 生成组件模板 | `pnpm exec figma connect create "<组件URL>" --outDir code-connect`                           |
| 解析映射   | `pnpm exec figma connect parse`                                                            |
| 预览代码   | `pnpm exec figma connect preview`                                                          |
| 查看属性   | `pnpm exec figma connect preview code-connect/Button.figma.ts --inspect`                   |
| 查看多状态  | `pnpm exec figma connect preview code-connect/Button.figma.ts --all --max-combinations 20` |
| 发布预检   | `pnpm exec figma connect publish --dry-run`                                                |
| 发布全部   | `pnpm exec figma connect publish --exit-on-unreadable-files`                               |
| 撤销预检   | `pnpm exec figma connect unpublish --dry-run`                                              |

以上命令已按当前 Figma 官方 CLI Reference 核对。

[image](https://www.google.com/s2/favicons?domain=https://developers.figma.com\&sz=32)

Developer Docs



官方参考文档：

[Code Connect CLI Quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/?utm_source=chatgpt.com)[.figma.ts Template Files](https://developers.figma.com/docs/code-connect/template-files/?utm_source=chatgpt.com)[Template API](https://developers.figma.com/docs/code-connect/template-api/?utm_source=chatgpt.com)[Code Connect 与 Figma MCP 集成](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/?utm_source=chatgpt.com)

## 最终建议：你现在的落地起点

你目前是一个前端先行的项目，因此可以由你承担前期组件库分析、CLI 配置、`.figma.ts` 编写和 Vue 页面验证；不需要等后端开发完成才开始 UI。

但正式发布需要三个前提：公司 Figma Library 的访问及发布权限、私有组件的真实 API，以及公司允许发布到 Figma 的代码映射内容。

我建议第一轮只选取公司设计系统中的 Button、Input、Dialog 三个真实组件，走完整的 `.figma.ts → preview → publish → MCP → Vue 页面` 流程。等它们能稳定生成正确的私有组件用法，再扩展到 Select、Table、Form 等复杂组件。

这样整个方案的长期分工就是：

设计师维护设计事实，前端维护组件映射与 UI 实现，后端维护业务服务契约，产品维护业务规则，Playwright 提供可复现的质量证据。

这才是一套可以从单人开发逐步扩展到正式研发团队的 Figma → Vue 企业级工作流。
