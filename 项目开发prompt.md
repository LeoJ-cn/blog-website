可以。现在把前面所有讨论正式收敛成一份**连续完整的项目工程需求 MD**。

这份可以直接作为项目的 `docs/specifications/engineering-foundation.md`，后续 Codex 搭架子、Review、增加配置都以它为基准。

# V2 Blog 前端大型工程骨架完整要求

## 1. 项目定位

本项目不是传统的文章型 Blog，而是一个面向开发者的 **Engineering Showcase / Developer Playground**。

项目主要用于展示个人完整的前端技术能力和可运行技术 Demo，例如 (这些tab不要都实现，留一个入口就好，等框架搭完后，一个一个添加，前期不要把实现这些功能，只提供一个tab入口切换就好了，显示“功能待开发”)：

- 大列表性能优化
- 虚拟列表
- 浏览器渲染性能
- Event Loop
- Web Worker
- WebSocket
- SSE 前端能力
- HTTP 请求治理
- 微前端
- Module Federation
- 前端缓存
- 浏览器存储
- 浏览器兼容与降级
- Vue 工程实践
- Vite 工程化
- Webpack 5 工程化
- Bundle 优化
- 构建性能优化
- 运行时性能监控
- 低代码
- AST
- 前端基建
- 其他后续技术 Demo

页面更接近：

```text
Engineering Showcase
│
├── Performance
│   ├── Large List
│   ├── Virtual List
│   ├── Web Worker
│   └── Runtime Metrics
│
├── Engineering
│   ├── Vite
│   ├── Webpack 5
│   ├── Bundle Optimization
│   └── Browser Compatibility
│
├── Architecture
│   ├── Micro Frontend
│   ├── Module Federation
│   └── Low Code
│
├── Network
│   ├── HTTP
│   ├── WebSocket
│   └── SSE
│
└── Browser
    ├── Event Loop
    ├── Storage
    ├── Worker
    └── Compatibility
```

技术页面不只是文字说明，需要尽可能包含：

```text
技术原理
+
实际代码
+
可交互 Demo
+
运行结果
+
性能指标
+
优化前后对比
```

---

# 2. 核心工程原则

本项目虽然初始业务代码量较少，但工程骨架必须按照真实大型生产项目标准设计。

核心原则：

> 业务可以简单，工程骨架不能因为当前项目规模较小而缩水。

不得因为：

- 当前只是个人项目
- 当前只是 Blog
- 当前代码量较少
- 当前某项能力暂时用不到

而擅自删除已经规划的大型项目工程能力。

对于暂时没有实际业务需求但已经确定需要存在的工程能力：

- 可以提供最小真实实现；
- 可以通过 Feature Flag 控制；
- 可以提供独立执行命令；
- 可以暂时不默认启用；

但不得直接删除。

同时遵循：

> 大型项目工程化不等于无意义增加依赖。

每个 Loader、Plugin、Package、配置项必须能够说明：

1. 它解决什么问题；
2. 它参与哪个阶段；
3. 为什么需要；
4. 是否影响开发性能；
5. 是否影响构建性能；
6. 是否影响运行时性能；
7. 是否可以通过 Benchmark 验证效果。

---

# 3. Repository 策略

本仓库只负责前端。

后端未来单独建立 Repository，例如：

```text
blog-web
blog-server
```

当前 Repository：

```text
blog-web
```

不考虑：

- FastAPI
- Python
- MySQL
- Redis
- 后端 Docker Compose
- AI Backend

前后端未来通过：

```text
HTTP
WebSocket
SSE
```

通信。

---

# 4. Monorepo

前端仓库使用：

```text
pnpm Workspace
+
Monorepo
```

基本结构：

```text
blog-web/
│
├── apps/
│   └── web/
│
├── packages/
│   ├── config/
│   ├── http/
│   ├── websocket/
│   ├── monitoring/
│   ├── ui/
│   ├── shared/
│   └── types/
│
├── docs/
├── scripts/
├── infra/
├── .github/
│
├── AGENTS.md
├── pnpm-workspace.yaml
├── package.json
└── ...
```

Monorepo 的目的不是单纯增加目录，而是建立清晰的：

```text
Application
        ↓
Shared Capability
        ↓
Infrastructure
```

边界。

---

# 5. Runtime 与 Package Manager

统一使用：

```text
Node.js 22+
fnm
pnpm
```

Node 版本必须在仓库中固定。

需要提供类似：

```text
.node-version
```

的版本约束。

pnpm 必须锁定版本。

项目依赖必须使用精确版本，不使用：

```text
^
~
*
latest
```

等浮动版本策略。

暂时不启用：

- Renovate
- Dependabot
- 自动依赖升级

所有依赖升级由人工控制。

---

# 6. 前端核心技术栈

使用：

```text
Vue 3
TypeScript
Vue Router
Pinia
Element Plus
SCSS
Axios
Native WebSocket
```

Vue 统一采用：

```vue
<script setup lang="ts">
```

以及：

```text
Composition API
```

作为主要开发模式。

---

# 7. 双 Build System

本项目必须同时存在两套完整构建系统：

```text
Vite
+
Webpack 5
```

两套系统：

- 必须共享同一份业务源码；
- 必须都可以启动开发环境；
- 必须都可以完成生产构建；
- 必须都可以生成可部署 SPA；
- 必须都考虑大型项目性能优化；
- 不允许 Webpack 只是 Demo 配置；
- 不允许 Vite 只是默认模板配置。

禁止：

```text
apps/web-vite
apps/web-webpack
```

这种业务代码复制。

正确模型：

```text
                apps/web/src
                     │
          ┌──────────┴──────────┐
          │                     │
        Vite                 Webpack 5
          │                     │
          ↓                     ↓
      dist-vite            dist-webpack
```

---

# 8. Build System 默认策略

默认开发：

```bash
pnpm dev
```

等价于：

```bash
pnpm dev:vite
```

同时支持：

```bash
pnpm dev:webpack
```

默认生产构建：

```bash
pnpm build
```

等价于：

```bash
pnpm build:vite
```

同时支持：

```bash
pnpm build:webpack
```

Vite 是默认开发链路。

Webpack 5 是正式的第二套完整 Build Pipeline，而不是备用 Demo。

---

# 9. Vite 企业级配置要求

Vite 配置不能停留在：

```ts
defineConfig({
  plugins: [vue()],
})
```

需要完整考虑：

```text
Development Performance
Build Performance
Bundle Performance
Runtime Performance
Browser Compatibility
SourceMap
Environment
Assets
CSS
Chunk
Cache
Analysis
Deployment
```

---

# 10. Vite Plugin

至少考虑：

```text
@vitejs/plugin-vue
unplugin-auto-import
unplugin-vue-components
ElementPlusResolver
@vitejs/plugin-legacy
Bundle Visualizer
```

Element Plus 必须按需引入。

不得：

```ts
app.use(ElementPlus)
```

进行无脑全量加载。

需要通过 Bundle Analyzer 验证 Element Plus 是否被意外整体打包。

---

# 11. Vite Development Performance

开发阶段需要考虑：

```text
HMR
Dependency Optimization
Plugin Cost
Proxy
Alias
SCSS
PostCSS
Environment
SourceMap
Dependency Pre-bundling
```

重点关注：

```text
optimizeDeps
server
resolve
css
plugins
define
```

Vite Plugin 不允许无意义堆叠。

需要考虑 Plugin Hook 对：

```text
启动速度
模块解析
transform
HMR
```

造成的成本。

---

# 12. Vite Production Performance

生产构建需要考虑：

```text
Browser Target
Legacy
Polyfill
Tree Shaking
Code Splitting
Route Lazy Loading
CSS Code Splitting
Asset Inline Strategy
Module Preload
Chunk Strategy
Minification
SourceMap
Asset Hash
Chunk Size
Long-term Cache
Bundle Analysis
Build Profile
```

---

# 13. Vite Chunk Strategy

需要规划：

```text
framework
├── vue
├── vue-router
└── pinia

ui-vendor
└── element-plus

vendor
└── other stable dependencies

features
└── route async chunks
```

但是不得为了拆包而拆包。

Chunk Strategy 必须结合：

```text
Bundle Analyzer
Network
Cache
Initial Bundle
Async Bundle
```

实际分析。

---

# 14. Webpack 5 定位

Webpack 5 必须按照真实大型项目 Build Pipeline 配置。

不得只配置：

```text
vue-loader
babel-loader
sass-loader
```

然后认为完成。

Webpack 需要覆盖：

```text
Development
Production
Loader Pipeline
Plugin Pipeline
Cache
Parallel Build
Optimization
Compatibility
Assets
SourceMap
Long-term Cache
Bundle Analysis
Build Profile
Performance Budget
```

---

# 15. Webpack 配置拆分

Webpack 不允许形成一个超大型：

```text
webpack.config.ts
```

建议拆分：

```text
apps/web/build/webpack/
│
├── config/
│   ├── webpack.common.ts
│   ├── webpack.dev.ts
│   └── webpack.prod.ts
│
├── loaders/
│   ├── vue.ts
│   ├── script.ts
│   ├── style.ts
│   └── assets.ts
│
├── plugins/
│   ├── html.ts
│   ├── css.ts
│   ├── define.ts
│   └── analyze.ts
│
├── optimization/
│   ├── cache.ts
│   ├── split-chunks.ts
│   ├── minimizer.ts
│   └── performance.ts
│
└── utils/
    ├── env.ts
    ├── paths.ts
    └── build.ts
```

实际文件数量可以根据实现适度调整，但职责必须分离。

---

# 16. Webpack Loader Pipeline

至少考虑：

```text
vue-loader
thread-loader
babel-loader
style-loader
css-loader
postcss-loader
sass-loader
```

Webpack 5 静态资源使用：

```text
Asset Modules
```

原则上不使用已经被 Webpack 5 原生能力取代的：

```text
file-loader
url-loader
raw-loader
```

---

# 17. thread-loader

`thread-loader` 必须纳入 Webpack 正式工程骨架。

JS / TS 转换链路：

```text
JS / TS
   ↓
include / exclude
   ↓
thread-loader
   ↓
babel-loader
   ↓
Webpack
```

必须考虑：

```text
workers
poolTimeout
开发环境
生产环境
CI 环境
CPU 数量
Worker 启动成本
IPC 成本
```

需要支持：

```text
WEBPACK_USE_THREADS=true
```

类似 Feature Flag。

方便：

```text
thread-loader ON
VS
thread-loader OFF
```

进行真实 Build Benchmark。

即使当前项目代码量较少导致 thread-loader 暂时没有性能收益，也不得因此删除该工程能力。

---

# 18. Babel

Webpack JS / TS Pipeline 使用 Babel。

需要：

```text
@babel/core
@babel/preset-env
babel-loader
core-js
```

并开启：

```text
babel-loader cacheDirectory
```

需要结合：

```text
Browserslist
```

进行目标浏览器转译。

---

# 19. Webpack Cache

Webpack 5 必须配置：

```text
filesystem cache
```

构建性能至少形成：

```text
thread-loader
        +
babel-loader cacheDirectory
        +
Webpack filesystem cache
```

多层优化。

同时需要合理处理：

```text
cache invalidation
build dependency
config change
dependency change
```

---

# 20. Webpack Resolve Performance

需要考虑：

```text
resolve.alias
resolve.extensions
resolve.modules
include
exclude
```

避免：

- Loader 扫描整个项目；
- Loader 扫描无关 node_modules；
- resolve.extensions 配置过多；
- 无意义模块查找。

---

# 21. Webpack Plugin

至少考虑：

```text
VueLoaderPlugin
HtmlWebpackPlugin
MiniCssExtractPlugin
DefinePlugin
CssMinimizerPlugin
TerserPlugin
CopyWebpackPlugin
BundleAnalyzerPlugin
```

Plugin 必须根据：

```text
development
production
analyze
```

环境启用。

禁止所有 Plugin 在所有环境无条件运行。

---

# 22. Webpack Development

开发环境重点：

```text
webpack-dev-server
HMR
快速 SourceMap
filesystem cache
thread-loader
babel cache
proxy
alias
SCSS
PostCSS
environment
```

开发环境优先：

```text
启动速度
增量编译速度
HMR
调试体验
```

而不是生产 Bundle 大小。

---

# 23. Webpack Production

生产环境重点：

```text
Tree Shaking
sideEffects
usedExports
SplitChunks
runtimeChunk
deterministic moduleIds
deterministic chunkIds
contenthash
Dynamic Import
Route Lazy Loading
JS Minification
CSS Extraction
CSS Minification
Performance Budget
Long-term Cache
```

---

# 24. Webpack SplitChunks

不能简单复制网上配置。

需要根据真实 Module Graph 规划：

```text
framework
ui-vendor
vendor
common
feature async chunks
```

重点分析：

```text
Initial Chunk
Async Chunk
重复依赖
Chunk Size
Cache Hit
HTTP 请求数量
```

---

# 25. Webpack Long-term Cache

需要通过：

```text
contenthash
runtimeChunk
deterministic moduleIds
deterministic chunkIds
splitChunks
```

尽量实现：

```text
修改 feature A

framework.xxxx.js       unchanged
ui-vendor.xxxx.js       unchanged
vendor.xxxx.js          unchanged

feature-a.yyyy.js       changed
```

减少无意义缓存失效。

---

# 26. Minification

Webpack Production：

```text
TerserPlugin
+
CssMinimizerPlugin
```

需要开启合理的并行能力。

需要根据 Production 环境考虑：

```text
console
debugger
comments
source map
license comment
```

处理策略。

不得为了缩小几 KB 破坏调试能力或第三方 License 要求。

---

# 27. Browser Compatibility

不支持：

```text
IE11
```

目标：

> 支持能够正常运行 Vue 3 的目标浏览器，并考虑部分较旧浏览器的语法、Runtime API 和 Browser API 兼容。

建立统一：

```text
Browserslist
        │
        ├── Vite
        ├── Webpack
        ├── Babel
        ├── PostCSS
        └── Polyfill
```

Browserslist 作为浏览器兼容目标的重要统一来源。

---

# 28. Polyfill Strategy

必须区分：

```text
Syntax Compatibility
        ↓
Transpile

Runtime API
        ↓
Polyfill

Browser Capability
        ↓
Feature Detection

无法 Polyfill
        ↓
Graceful Degradation
```

例如：

```text
Promise
Map
Set
URL
Object.entries
```

属于 Runtime API。

而：

```text
IntersectionObserver
ResizeObserver
Web Worker
WebSocket
WebGL
```

属于浏览器能力，需要根据具体能力进行：

```text
Feature Detection
+
Fallback
```

不得简单：

```ts
import 'core-js'
```

把全部 Polyfill 无条件发送给所有用户。

---

# 29. SCSS

CSS 技术栈：

```text
SCSS
+
PostCSS
+
Autoprefixer
```

需要规划：

```text
variables
mixins
functions
reset
design tokens
Element Plus theme variables
```

但不创建无意义的大型 CSS Framework。

---

# 30. CSS Build Pipeline

Vite：

```text
SCSS
 ↓
Vite CSS Pipeline
 ↓
PostCSS
 ↓
Autoprefixer
 ↓
Production CSS
```

Webpack Development：

```text
SCSS
 ↓
sass-loader
 ↓
postcss-loader
 ↓
css-loader
 ↓
style-loader
```

Webpack Production：

```text
SCSS
 ↓
sass-loader
 ↓
postcss-loader
 ↓
css-loader
 ↓
MiniCssExtractPlugin
 ↓
CssMinimizerPlugin
```

---

# 31. Element Plus

Element Plus 必须按需加载。

使用：

```text
unplugin-auto-import
unplugin-vue-components
ElementPlusResolver
```

需要同时兼容：

```text
Vite
Webpack 5
```

不得因为双构建系统导致：

```text
Vite 按需
Webpack 全量
```

这种能力不一致。

---

# 32. Environment

需要完整考虑：

```text
development
test
staging
production
```

以及：

```text
Vite
Webpack
GitHub Actions
Docker Build
```

环境变量不能散落在业务代码。

禁止大量直接使用：

```ts
import.meta.env
```

或者：

```ts
process.env
```

---

# 33. Runtime Config

统一通过：

```ts
import { env } from '@blog/config'
```

类似方式读取：

```text
apiBaseUrl
wsUrl
appEnv
buildTool
version
commit
isDev
isProd
```

形成：

```text
Business
   ↓
Runtime Config
   ↓
┌─────────────┐
│             │
Vite       Webpack
│             │
import.meta   DefinePlugin
```

构建工具实现不得污染业务层。

---

# 34. Build Info

构建时注入：

```text
App Version
Build Tool
Build Mode
Commit SHA
Build Time
```

例如：

```text
Version: 2.0.0
Build Tool: Vite
Mode: production
Commit: abc123
```

这些信息未来可以直接在 Engineering 页面展示。

---

# 35. packages/http

Axios 不直接散落到业务代码。

建立：

```text
packages/http/
└── src/
    ├── client/
    ├── interceptors/
    ├── adapters/
    ├── errors/
    ├── retry/
    ├── types/
    └── index.ts
```

业务：

```ts
import { http } from '@blog/http'
```

而不是：

```ts
import axios from 'axios'
```

第一阶段至少实现：

```text
createHttpClient
baseURL
timeout
request interceptor
response interceptor
统一错误
AbortSignal
请求参数类型
Response 泛型
```

架构预留：

```text
retry
trace
monitoring
auth
```

---

# 36. packages/websocket

WebSocket 与 HTTP 分离。

建立：

```text
packages/websocket/
└── src/
    ├── client/
    ├── reconnect/
    ├── heartbeat/
    ├── events/
    ├── types/
    └── index.ts
```

架构考虑：

```text
connect
disconnect
send
subscribe
connection state
error
reconnect
heartbeat
```

第一阶段至少实现：

```text
连接
关闭
发送
message
状态管理
基础 reconnect
```

不能只是创建空目录。

---

# 37. packages/monitoring

性能监控作为正式 Package。

结构：

```text
packages/monitoring/
└── src/
    ├── performance/
    ├── errors/
    ├── reporter/
    ├── types/
    └── index.ts
```

考虑：

```text
Navigation Timing
Resource Timing
Paint Timing
FCP
LCP
CLS
INP
Long Task
```

以及：

```text
JS Error
Unhandled Promise Rejection
HTTP Duration
WebSocket State
```

第一阶段至少提供：

```text
Performance Collection
+
Console Reporter
```

未来可以扩展：

```text
HTTP Reporter
```

---

# 38. packages/ui

创建共享 UI Package：

```text
packages/ui
```

第一阶段提供简单但真实的公共组件，例如：

```text
AppLoading
AppError
EmptyState
```

Element Plus 是底层 UI Library。

`@blog/ui` 是项目自己的共享 UI Layer。

不得为了封装而封装。

例如简单：

```vue
<el-button />
```

没有必要再创建：

```vue
<BlogButton />
```

除非确实存在统一业务语义或 Design System 需求。

---

# 39. packages/shared

用于 framework-agnostic 工具。

例如：

```text
debounce
throttle
sleep
retry
storage
guards
```

原则：

```text
shared
```

不得依赖：

```text
Vue
Pinia
Element Plus
```

尽量保持纯 TypeScript。

---

# 40. packages/types

存放真正跨 Package / App 的公共 Type。

例如：

```ts
ApiResponse<T>
PageRequest
PageResponse<T>
Nullable<T>
Maybe<T>
BuildInfo
PerformanceMetric
WebSocketMessage<T>
```

不得把所有业务 Interface 都塞入：

```text
packages/types
```

Feature 私有类型必须留在 Feature 内。

---

# 41. packages/config

负责共享配置抽象，例如：

```text
Runtime Config
Environment Type
Build Info
Feature Flag
公共 Config Schema
```

但是：

```text
packages/config
```

不等于：

```text
所有 Vite / Webpack 配置
```

构建工具自身配置继续放：

```text
apps/web/build/
```

---

# 42. Vue Application Architecture

`apps/web/src` 使用：

```text
src/
├── app/
├── pages/
├── widgets/
├── features/
├── shared/
└── assets/
```

依赖方向大致：

```text
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
shared
```

---

# 43. Feature Architecture

技术 Demo 按 Feature 组织。

例如：

```text
features/
├── list-performance/
├── virtual-list/
├── micro-frontend/
├── websocket-demo/
├── worker-demo/
├── browser-demo/
├── low-code/
└── build-performance/
```

单个 Feature 可以：

```text
list-performance/
├── components/
├── composables/
├── model/
├── api/
├── utils/
├── types/
└── index.ts
```

原则：

> 优先按照业务能力组织代码，而不是按照文件类型把整个项目的组件、Hook、API 全部堆在一起。

---

# 44. Vue Router

使用：

```text
Vue Router
```

必须考虑：

```text
Route Lazy Loading
Nested Route
404
Route Meta
Navigation Guard
Chunk Loading Error
GitHub Pages SPA
```

大型 Feature 默认使用：

```ts
() => import(...)
```

进行路由级代码分割。

---

# 45. Pinia

使用：

```text
Pinia
```

但不得把所有状态全部放入 Pinia。

优先级：

```text
Local State
    ↓
Composable
    ↓
Feature State
    ↓
Global Pinia Store
```

只有：

```text
跨页面
跨 Feature
需要长期生命周期
```

的数据进入全局 Store。

---

# 46. ESLint

ESLint 不采用过于严格的规则。

使用：

```text
Base
+
TypeScript
+
Vue
+
Project Extension
```

重点检查：

```text
明显 Bug
Unused
Promise 问题
Vue 常规问题
Import 基础问题
```

不强制：

```text
函数最多多少行
参数最多多少个
极端复杂度限制
过度命名规则
```

---

# 47. Prettier

Prettier 只负责：

```text
Code Formatting
```

不得和 ESLint 重复承担代码质量职责。

---

# 48. Stylelint

Stylelint 用于：

```text
CSS
SCSS
Vue Style
```

基础质量检查。

规则保持合理，不做极端限制。

---

# 49. Husky

使用：

```text
Husky
```

管理 Git Hooks。

---

# 50. lint-staged

使用：

```text
lint-staged
```

只检查当前暂存文件。

避免每次 commit：

```text
全仓 ESLint
+
全仓 Stylelint
```

导致大型项目提交速度严重下降。

---

# 51. Commit Convention

采用：

```text
Conventional Commits
```

例如：

```text
feat:
fix:
refactor:
perf:
build:
chore:
docs:
test:
ci:
```

但是：

> Commit 规范只提示，不强制阻断提交。

不得因为 Commit Message 格式不正确直接阻止开发者 commit。

可以：

```text
warning
+
documentation
+
example
```

但不作为强 Gate。

---

# 52. Unit Test

架构中明确标注：

```text
Vitest
```

但是：

```text
当前阶段不安装
当前阶段不实现
```

未来主要用于：

```text
utils
http
websocket
store
composable
数据转换
复杂业务函数
```

---

# 53. Component Test

架构中明确标注：

```text
Vue Test Utils
```

但是：

```text
当前阶段不安装
当前阶段不实现
```

未来主要用于：

```text
复杂交互组件
共享组件
状态组件
表单
异常状态
```

不追求所有 Vue Component 都写 Component Test。

---

# 54. E2E

使用：

```text
Playwright
```

但是当前只实现：

```text
1～2 个 Smoke Test
```

例如：

```text
打开首页
```

以及：

```text
首页
 ↓
进入某个技术 Demo
 ↓
页面正常渲染
```

E2E 当前目的：

> 验证 E2E Pipeline 可用。

主要开发精力继续放在实际项目功能。

---

# 55. Performance Monitoring

项目必须包含性能监控能力。

不仅关注：

```text
Build Performance
```

还需要关注：

```text
Runtime Performance
```

形成：

```text
Build Performance
+
Bundle Performance
+
Runtime Performance
```

完整性能治理体系。

---

# 56. Bundle Analysis

Vite 与 Webpack 都必须支持 Bundle Analysis。

Vite：

```text
Bundle Visualizer
```

Webpack：

```text
BundleAnalyzerPlugin
```

提供独立命令，例如：

```bash
pnpm analyze:vite
pnpm analyze:webpack
```

分析模式不得默认参与普通开发启动。

---

# 57. Build Benchmark

必须提供：

```text
Vite
VS
Webpack 5
```

Build Benchmark 能力。

至少考虑：

```text
Cold Build
Warm Build
Output Size
Gzip Size
Chunk Count
Largest Chunk
```

后续可以扩展：

```text
Dev Startup
HMR
Build CPU
Build Memory
```

所有 Benchmark 数据必须真实运行采集，不允许写死。

---

# 58. thread-loader Benchmark

Webpack Build Benchmark 需要支持：

```text
thread-loader ON
VS
thread-loader OFF
```

用于观察：

```text
小项目
大型项目
Cold Build
Warm Build
```

不同场景下并行 Loader 的真实收益。

---

# 59. SourceMap Strategy

不同环境使用不同 SourceMap 策略。

原则：

```text
development
→ 优先构建速度和调试

test/staging
→ 优先错误定位

production
→ 在安全、体积、监控之间权衡
```

Vite 与 Webpack 都需要独立配置。

不得：

```text
所有环境统一 source-map
```

---

# 60. Asset Strategy

需要统一考虑：

```text
Image
SVG
Font
JSON
Other Static Assets
```

包括：

```text
inline threshold
hash filename
public assets
import assets
cache
```

Webpack 5 使用：

```text
Asset Modules
```

Vite 使用其原生 Asset Pipeline。

---

# 61. Performance Budget

生产构建需要考虑 Performance Budget。

关注：

```text
Initial JS
Initial CSS
Largest Chunk
Asset Size
Total Bundle
```

第一阶段可以设置合理 Warning。

不要因为初始 Demo 很小设置完全没有实际意义的极端阈值。

---

# 62. Tree Shaking

Vite 与 Webpack 都必须确保：

```text
Tree Shaking
```

正常工作。

需要注意：

```text
ES Modules
sideEffects
第三方 Package
Barrel Export
Element Plus
内部 packages
```

不得只认为：

```text
production mode = 自动解决所有 Tree Shaking
```

需要通过 Bundle Analysis 验证。

---

# 63. Dynamic Import

大型 Feature 默认：

```text
Dynamic Import
```

尤其：

```text
Micro Frontend Demo
Performance Demo
Low-code Demo
Worker Demo
Build Demo
```

避免所有技术 Demo 首屏全部加载。

---

# 64. Compression

需要区分：

```text
Minification
```

和：

```text
HTTP Compression
```

JS/CSS Minification 属于构建职责。

Gzip/Brotli 是否预生成，需要结合：

```text
GitHub Pages
CDN
实际部署环境
```

决定。

不得仅为了存在一个 Compression Plugin 就生成无实际用途的文件。

但是压缩能力必须纳入架构设计和分析。

---

# 65. GitHub Pages

当前生产部署：

```text
GitHub Pages
```

基本 Pipeline：

```text
Git Push
   ↓
GitHub Actions
   ↓
Install
   ↓
Lint
   ↓
Type Check
   ↓
E2E / Required Checks
   ↓
Production Build
   ↓
dist
   ↓
GitHub Pages
```

需要正确处理：

```text
base path
SPA routing
assets path
environment
build info
```

---

# 66. GitHub Actions

`.github/workflows` 至少考虑：

```text
ci.yml
deploy-pages.yml
```

CI：

```text
Install
Lint
Stylelint
Type Check
Build
E2E
```

部署：

```text
Production Build
Artifact
GitHub Pages
```

Vite 为默认正式部署链路。

Webpack 5 需要在 CI 中至少验证：

```text
production build success
```

避免第二构建链路长期没人运行最终失效。

---

# 67. Docker

Docker 不作为日常开发的默认方式。

正常开发：

```text
fnm
 ↓
Node
 ↓
pnpm
 ↓
pnpm dev
```

GitHub Pages 正常部署也不依赖 Docker。

Docker 在当前前端仓库主要负责：

```text
Production Build Verification
+
Build Benchmark Environment
+
Static Production Preview
```

---

# 68. Docker Build Verification

Docker 可以使用固定：

```text
Node
pnpm
OS
```

环境分别执行：

```text
pnpm build:vite
pnpm build:webpack
```

排除：

```text
开发者 Mac 环境
Node 小版本差异
本地缓存
本地配置
```

对构建结果造成的影响。

---

# 69. Docker Benchmark

Build Benchmark 可以提供 Docker 模式。

形成：

```text
Same Node
Same pnpm
Same Linux
Same CPU Limit
Same Memory Limit

        ↓

Vite
VS
Webpack
```

提高 Benchmark 可重复性。

---

# 70. Static Production Preview

Docker 可以提供：

```text
Build
 ↓
dist
 ↓
Nginx / Static Server
```

模拟生产静态资源环境。

但 Docker 不参与 GitHub Pages 正式发布链路。

---

# 71. AGENTS.md

必须采用：

```text
分层
+
就近约束
```

禁止一个超大型：

```text
AGENTS.md
```

管理所有规则。

第一阶段：

```text
blog-web/
│
├── AGENTS.md
│
├── apps/
│   └── web/
│       └── AGENTS.md
│
└── packages/
    └── AGENTS.md
```

---

# 72. Root AGENTS.md

根 AGENTS 只负责：

```text
项目目标
Repository 结构
核心技术栈
工程原则
Build 原则
Git 原则
测试原则
安全原则
文档原则
Agent 行为
安装原则
```

不能把所有 Vue / Webpack / Package 细节全部写进去。

---

# 73. apps/web/AGENTS.md

负责：

```text
Vue
TypeScript
Router
Pinia
Element Plus
Feature Architecture
Component
Composable
SCSS
Vite
Webpack
Build
Browser Compatibility
E2E
```

前端应用自己的开发规则。

---

# 74. packages/AGENTS.md

负责：

```text
Package Boundary
Dependency Direction
Public API
Framework Dependency
Type
Shared
HTTP
WebSocket
Monitoring
UI
```

尤其限制：

```text
packages/shared
```

不得依赖 Vue 等业务框架。

---

# 75. AGENTS 工程骨架约束

必须明确写入：

> 工程骨架按照大型生产项目标准设计。不得以当前项目规模较小、当前暂未使用、Blog 业务简单等理由，擅自删除或简化已经规划的构建、开发、兼容性、性能、质量、监控和工程治理能力。

同时：

> 对于当前无需默认启用的能力，应采用配置预留、Feature Flag 或独立命令等方式保留，而不是直接删除。

---

# 76. AGENTS 双构建约束

必须明确：

> Vite 与 Webpack 5 是两套正式 Build Pipeline。两者必须支持独立开发启动与生产构建，并在环境变量、浏览器兼容、资源处理、代码分割、Tree Shaking、压缩、缓存、SourceMap、性能分析和部署产物等核心目标上保持一致。

同时：

> 两套构建系统允许采用各自最合适的实现方式，不要求配置形式完全一致。

---

# 77. Agent 安装约束

任何 Agent / Codex：

> 不允许自动安装软件、依赖、工具或插件。

当需要安装时必须：

```text
1. 给出安装命令
2. 停止
3. 用户自行安装
4. 给出验证命令
5. 用户确认成功
6. 再继续配置
```

不得：

```text
自动 pnpm add
自动 npm install
自动 brew install
自动安装 CLI
```

---

# 78. Docs

预留：

```text
docs/
├── specifications/
├── architecture/
└── plans/
```

当前不要求大量编写架构文档。

但是目录和规则需要存在。

文档默认使用：

```text
简体中文
```

技术标识符、命令、代码、API、路径等保留英文。

---

# 79. Scripts

预留：

```text
scripts/
```

用于：

```text
Build Benchmark
Bundle Statistics
Environment Validation
Build Utilities
```

不得把大量复杂 Node Script 全部塞进：

```text
package.json
```

---

# 80. npm / pnpm Scripts

至少规划：

```text
dev
dev:vite
dev:webpack

build
build:vite
build:webpack

build:test
build:staging
build:prod

preview
preview:vite
preview:webpack

typecheck

lint
lint:style
format

e2e

analyze:vite
analyze:webpack

benchmark:build
benchmark:webpack:threads
```

具体命令可以根据最终工具实现调整。

不得为了“看起来企业级”创建大量没有真实用途的 script。

---

# 81. Git

当前开发分支：

```text
feature/v2-blog-website
```

当前不重新设计 Git Branch Strategy。

---

# 82. SEO

当前阶段：

```text
不考虑 SEO
```

不引入：

```text
SSR
SSG
SEO Framework
```

本项目当前定位为：

```text
SPA
```

---

# 83. SSR

当前不考虑：

```text
SSR
```

原因：

```text
GitHub Pages
+
Static Deployment
+
Engineering Showcase
```

当前没有 SSR 必要。

---

# 84. i18n

架构中允许未来加入：

```text
vue-i18n
```

但当前：

```text
不安装
不实现
```

---

# 85. RBAC

当前项目不实现：

```text
RBAC
Permission
Auth Guard
```

除非未来出现真实业务需求。

---

# 86. 自动依赖升级

不使用：

```text
Renovate
Dependabot
```

所有依赖：

```text
Exact Version
+
pnpm-lock.yaml
```

统一锁定。

---

# 87. 最终目录结构

第一阶段目标目录：

```text
blog-web/
│
├── apps/
│   └── web/
│       │
│       ├── src/
│       │   ├── app/
│       │   │   ├── config/
│       │   │   ├── polyfills/
│       │   │   ├── providers/
│       │   │   └── router/
│       │   │
│       │   ├── pages/
│       │   ├── widgets/
│       │   ├── features/
│       │   ├── shared/
│       │   └── assets/
│       │
│       ├── build/
│       │   ├── shared/
│       │   │   ├── env.ts
│       │   │   ├── paths.ts
│       │   │   └── constants.ts
│       │   │
│       │   ├── vite/
│       │   │   ├── config/
│       │   │   ├── plugins/
│       │   │   ├── optimization/
│       │   │   └── utils/
│       │   │
│       │   └── webpack/
│       │       ├── config/
│       │       ├── loaders/
│       │       ├── plugins/
│       │       ├── optimization/
│       │       └── utils/
│       │
│       ├── e2e/
│       ├── public/
│       │
│       ├── AGENTS.md
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── webpack.config.ts
│
├── packages/
│   ├── config/
│   ├── http/
│   ├── websocket/
│   ├── monitoring/
│   ├── ui/
│   ├── shared/
│   ├── types/
│   └── AGENTS.md
│
├── docs/
│   ├── specifications/
│   ├── architecture/
│   └── plans/
│
├── scripts/
│   ├── build-benchmark/
│   └── build-utils/
│
├── infra/
│   └── docker/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy-pages.yml
│
├── AGENTS.md
│
├── eslint.config.ts
├── prettier.config.mjs
├── stylelint.config.mjs
├── postcss.config.mjs
├── playwright.config.ts
│
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── package.json
├── tsconfig.json
│
├── .node-version
├── .npmrc
├── .gitignore
│
└── README.md
```

---

# 88. Testing Architecture 标注

虽然 Vitest 与 Vue Component Test 当前不安装，但架构必须明确：

```text
Testing
│
├── Unit
│   └── Vitest
│       [Reserved / Not Installed]
│
├── Component
│   └── Vue Test Utils
│       [Reserved / Not Installed]
│
└── E2E
    └── Playwright
        [Enabled]
        │
        ├── home.spec.ts
        └── navigation.spec.ts
```

---

# 89. Build Architecture

最终 Build Architecture：

```text
                       Source Code
                           │
                      apps/web/src
                           │
              ┌────────────┴────────────┐
              │                         │
            Vite                     Webpack 5
              │                         │
       Vite Build Pipeline        Loader Pipeline
              │                         │
       Plugin Pipeline            Plugin Pipeline
              │                         │
        Optimization              Optimization
              │                         │
      Browser Compatibility     Browser Compatibility
              │                         │
         Code Splitting            SplitChunks
              │                         │
          Minification             Minification
              │                         │
          dist-vite              dist-webpack
              │                         │
              └────────────┬────────────┘
                           │
                    Build Benchmark
                           │
                     Bundle Analyze
```

---

# 90. Performance Architecture

整个项目性能治理分成：

```text
Performance
│
├── Development Performance
│   ├── Startup
│   ├── HMR
│   ├── Loader
│   ├── Plugin
│   └── Cache
│
├── Build Performance
│   ├── Parallel
│   ├── thread-loader
│   ├── Babel Cache
│   ├── Filesystem Cache
│   ├── Minifier Parallel
│   └── Build Profile
│
├── Bundle Performance
│   ├── Tree Shaking
│   ├── Code Splitting
│   ├── SplitChunks
│   ├── Dynamic Import
│   ├── CSS Split
│   ├── Minification
│   └── Long-term Cache
│
└── Runtime Performance
    ├── FCP
    ├── LCP
    ├── CLS
    ├── INP
    ├── Long Task
    ├── Resource Timing
    └── Error Monitoring
```

---

# 91. 项目工程目标

本项目最终不是为了证明：

```text
我会 Vue
```

而是展示：

```text
Vue 3 Application Architecture

TypeScript Engineering

pnpm Monorepo

Vite Enterprise Build Pipeline

Webpack 5 Enterprise Build Pipeline

Webpack Loader / Plugin Architecture

thread-loader Parallel Build

Build Cache

Tree Shaking

Code Splitting

SplitChunks

Long-term Cache

Browser Compatibility

Polyfill Strategy

Bundle Analysis

Build Benchmark

Runtime Performance Monitoring

HTTP Infrastructure

WebSocket Infrastructure

Shared Package Design

Component Architecture

Feature Architecture

Git Engineering

CI/CD

Docker Build Verification
```

形成一个可以长期不断增加技术 Demo 的：

> **大型前端工程基础设施 + Engineering Showcase。**

---

# 92. 第一阶段验收标准

基础架子完成后至少满足：

```text
pnpm dev
```

可以通过 Vite 正常启动。

```text
pnpm dev:webpack
```

可以通过 Webpack 5 正常启动。

两者运行：

```text
同一份 Vue 3 Application
```

并且：

```text
pnpm build:vite
```

可以完成 Production Build。

```text
pnpm build:webpack
```

可以完成 Production Build。

同时：

```text
Vue Router
Pinia
Element Plus
SCSS
Axios Package
WebSocket Package
Monitoring Package
UI Package
Shared Package
Types Package
Config Package
```

全部正常工作。

另外：

```text
ESLint
Prettier
Stylelint
Husky
lint-staged
Playwright
```

全部完成基础配置。

需要至少存在：

```text
1～2 个 Playwright Smoke Test
```

并且：

```text
analyze:vite
analyze:webpack
```

能够实际生成 Bundle Analysis。

```text
benchmark:build
```

能够真实比较 Vite / Webpack Build。

Webpack：

```text
thread-loader
babel cache
filesystem cache
SplitChunks
runtimeChunk
contenthash
Tree Shaking
Production Minification
```

必须实际存在。

Vite：

```text
Dependency Optimization
Chunk Strategy
Code Splitting
Tree Shaking
Legacy / Browser Compatibility
Production Minification
Bundle Analysis
```

必须实际存在。

GitHub Actions：

```text
CI
+
GitHub Pages Deploy
```

能够形成完整 Pipeline。

Docker：

```text
Production Build Verification
+
Static Preview
+
Build Benchmark Environment
```

具备可运行基础。

---

# 93. 最终开发原则

整个项目后续始终遵守：

> **业务代码按真实需求逐步增加，工程基础设施按照大型生产项目标准维护。**

> **不得因为当前项目规模较小而擅自简化已经确定的工程骨架。**

> **不得为了表现“企业级”而增加没有职责、无法解释、无法验证的无意义配置。**

> **Vite 与 Webpack 5 必须是真实可运行的双 Build Pipeline，而不是一主一假的演示配置。**

> **性能优化必须同时关注开发性能、构建性能、Bundle 性能和运行时性能。**

> **重要性能优化尽可能通过 Benchmark、Bundle Analyzer、Build Profile 或 Runtime Metrics 验证，而不是仅凭经验宣称有效。**

> **公共能力优先通过明确 Package Boundary 隔离，业务能力优先按照 Feature 组织。**

> **AGENTS.md 使用分层和就近约束，不创建单个超大型规则文件。**

> **所有软件、依赖、工具和插件安装均由用户手动执行；Agent 只能提供安装命令和验证命令，不得自行安装。**

这份现在已经可以作为**项目骨架的总需求基线**。下一步真正开始搭建时，我建议直接按它拆成 **Phase 1：Runtime/Monorepo → Phase 2：Vue 基础 → Phase 3：Vite → Phase 4：Webpack 5 → Phase 5：工程规范 → Phase 6：Packages → Phase 7：E2E/CI/Docker/Benchmark**，这样不会一上来同时装几十个依赖导致问题很难定位。
