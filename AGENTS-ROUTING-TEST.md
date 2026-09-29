# AGENTS.md 分层路由测试指南

## 1. 测试目标

本文用于验证从仓库根目录启动 Codex 时，是否能够根据任务涉及的目标文件主动读取正确的分层规则和专题文档，同时避免读取无关文档。

需要验证的规则链分为三类：

```text
应用代码：根 AGENTS.md → apps/<app>/AGENTS.md → 必要的专题文档
Package：根 AGENTS.md → packages/AGENTS.md → packages/<name>/AGENTS.md → 必要的专题文档
文档：根 AGENTS.md → docs/AGENTS.md → 当前目标文档及必要来源
```

本测试不验证业务功能，也不要求启动开发服务器、页面或浏览器。

## 2. 重要限制

`AGENTS.md` 的自动发现通常在新会话启动时完成。修改规则后，不得使用已经打开的旧会话验证自动加载结果。

每轮行为测试必须满足：

1. 新建 Codex 会话。
2. 项目主目录或 cwd 是仓库根目录：

   ```text
   /Users/leojm5/Documents/company/blog-website
   ```

3. 不切换到 `apps/web` 或任何 `packages/<name>` 子目录。
4. 提示词要求只做规则发现，不修改文件。
5. 以实际文件读取工具记录为准，不能只依据 Codex 最终回复中的自述。

## 3. 测试前检查

在仓库根目录执行：

```bash
pwd
git status --short
find apps packages docs -name AGENTS.md -type f -print | sort
```

预期 `pwd`：

```text
/Users/leojm5/Documents/company/blog-website
```

预期至少包含以下规则文件：

```text
apps/web/AGENTS.md
docs/AGENTS.md
packages/AGENTS.md
packages/config/AGENTS.md
packages/http/AGENTS.md
packages/low-code/AGENTS.md
packages/monitoring/AGENTS.md
packages/shared/AGENTS.md
packages/types/AGENTS.md
packages/ui/AGENTS.md
packages/websocket/AGENTS.md
```

`git status --short` 只用于记录测试前工作区状态。不要为了测试清理、还原或提交现有改动。

## 4. 静态结构检查

### 4.1 检查根规则入口

执行：

```bash
rg -n '涉及 `apps/\*\*`|涉及 `packages/\*\*`|涉及 `docs/\*\*`' AGENTS.md
```

预期同时出现：

```text
apps/**
packages/**
docs/**
```

### 4.2 检查所有非根规则继承根规则

执行：

```bash
for agent_file in $(find apps packages docs -name AGENTS.md -type f | sort); do
  rg -q -F '继承仓库根目录 `AGENTS.md`' "$agent_file" || echo "缺少根规则继承声明: $agent_file"
done
```

预期：命令不输出任何“缺少根规则继承声明”。

### 4.3 检查 Package 子级继承通用 Package 规则

执行：

```bash
for agent_file in $(find packages -mindepth 2 -maxdepth 2 -name AGENTS.md -type f | sort); do
  rg -q -F '`packages/AGENTS.md`' "$agent_file" || echo "缺少 packages 规则继承声明: $agent_file"
done
```

预期：命令不输出任何“缺少 packages 规则继承声明”。

### 4.4 检查格式

执行：

```bash
git diff --check
```

预期：命令无输出，退出码为 `0`。

## 5. 桌面端行为测试

以下每个用例推荐使用独立的新会话。这样既能验证新会话加载，也能避免前一个用例已经读取的文档污染后续结果。

### 用例 A：普通 Package 不读取专题文档

提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次任务需要修改 packages/shared/src/index.ts。
请根据仓库根规则实际读取本任务适用的 AGENTS.md，然后报告：
1. 实际读取的规则文件绝对路径；
2. 本任务适用的规则继承链；
3. 实际读取的 docs 文件；
4. 为什么需要或不需要读取这些 docs 文件。
```

预期读取：

```text
AGENTS.md
packages/AGENTS.md
packages/shared/AGENTS.md
```

预期不读取：

```text
docs/**
其他 packages/*/AGENTS.md
```

通过条件：实际工具记录中只出现上述三层规则，没有读取任何专题文档。

### 用例 B：普通逻辑编辑器修改只读取原实现参考

提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次任务需要修复 packages/low-code/src/logic-editor 中方法返回值无法保存的问题。
请根据仓库根规则实际读取本任务适用的 AGENTS.md 和必须阅读的专题文档，然后报告所有实际读取路径及读取原因。
```

预期读取：

```text
AGENTS.md
packages/AGENTS.md
packages/low-code/AGENTS.md
docs/references/logic-editor-original-implementation.md
```

预期不读取：

```text
docs/superpowers/specs/2026-09-28-low-code-logic-editor-migration-design.md
docs/superpowers/plans/2026-09-28-low-code-logic-editor-migration.md
docs/superpowers/specs/2026-09-28-low-code-type-governance-design.md
monitoring 相关文档
```

通过条件：读取原实现参考，但没有因为出现 `low-code` 就通读迁移、类型治理或其他专题文档。

### 用例 C：Low-code 等价迁移按条件读取迁移设计

提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次任务是继续核对 packages/low-code/src/logic-editor 与旧仓库逻辑编辑器的等价迁移差异，但本次不执行既有实施计划。
请实际读取适用规则和专题文档，并列出所有实际读取路径及读取原因。
```

预期读取：

```text
AGENTS.md
packages/AGENTS.md
packages/low-code/AGENTS.md
docs/references/logic-editor-original-implementation.md
docs/superpowers/specs/2026-09-28-low-code-logic-editor-migration-design.md
```

预期不读取：

```text
docs/superpowers/plans/2026-09-28-low-code-logic-editor-migration.md
docs/superpowers/specs/2026-09-28-low-code-type-governance-design.md
```

通过条件：读取迁移设计，但因为提示词明确“不执行既有实施计划”，所以不读取 migration plan。

### 用例 D：Low-code 类型治理与迁移文档隔离

提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次任务需要处理 packages/low-code 中的 TypeScript 工程归属、G6 类型和严格类型诊断，不涉及逻辑编辑器功能迁移，也不继续既有 phase plan。
请实际读取适用规则和专题文档，并列出所有实际读取路径及读取原因。
```

预期读取：

```text
AGENTS.md
packages/AGENTS.md
packages/low-code/AGENTS.md
docs/superpowers/specs/2026-09-28-low-code-type-governance-design.md
```

预期不读取：

```text
docs/superpowers/specs/2026-09-28-low-code-logic-editor-migration-design.md
docs/superpowers/plans/2026-09-28-low-code-type-governance-phase-1.md
docs/superpowers/plans/2026-09-28-low-code-type-governance-phase-2.md
```

说明：如果实际任务同时涉及逻辑编辑器行为，应额外读取原实现参考；本测试提示明确限定为类型治理，用于检查路由隔离。

### 用例 E：Monitoring 帧监控与性能面板分流

第一轮提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次任务需要修改 packages/monitoring 中的目标帧预算、掉帧和 Long Animation Frame 指标语义，不继续既有实施计划。
请实际读取适用规则和专题文档，并列出所有实际读取路径及读取原因。
```

第一轮预期读取：

```text
AGENTS.md
packages/AGENTS.md
packages/monitoring/AGENTS.md
docs/superpowers/specs/2026-09-27-frame-monitor-v2-design.md
```

第一轮预期不读取：

```text
docs/superpowers/plans/2026-09-27-frame-monitor-v2.md
low-code 相关文档
```

第二轮应使用另一个新会话，提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次任务只处理 packages/monitoring 与 Vue 通用性能面板之间的公共协议和集成边界，不继续既有实施计划。
请实际读取适用规则和专题文档，并列出所有实际读取路径及读取原因。
```

第二轮预期额外读取：

```text
docs/superpowers/specs/2026-09-27-reusable-performance-panel-design.md
```

通过条件：两类任务分别读取对应设计，不读取对方不相关的计划文档。

### 用例 F：Web Runtime Service 路由

提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次任务需要修改 apps/web/src/app/services 下的 WebSocket 服务装配。
请实际读取适用规则和专题文档，并列出所有实际读取路径及读取原因。
```

预期读取：

```text
AGENTS.md
apps/web/AGENTS.md
docs/specifications/runtime-services.md
```

预期不读取：

```text
packages/websocket/AGENTS.md
```

说明：这里只假设修改 `apps/web/src/app/services/**`。如果真实任务同时修改 `packages/websocket/**`，则还必须读取 `packages/AGENTS.md` 和 `packages/websocket/AGENTS.md`。

### 用例 G：文档修改不通读 docs

提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次只需要修正 docs/specifications/runtime-services.md 中的一处错别字。
请实际读取适用规则和必要文档，并列出所有实际读取路径。禁止遍历或通读整个 docs 目录。
```

预期读取：

```text
AGENTS.md
docs/AGENTS.md
docs/specifications/runtime-services.md
```

预期不读取：

```text
docs/references/**
docs/superpowers/specs/**
docs/superpowers/plans/**
```

通过条件：只读取目标文档和文档规则，没有为了修改一处文字加载全部文档。

## 6. 多区域任务测试

提示词：

```text
只进行规则发现，不修改任何文件，也不要运行测试或构建。

假设本次任务同时修改：
- apps/web/src/pages/PlaygroundLowCodePage.vue
- packages/low-code/src/logic-editor/LogicEditor.tsx

请实际读取所有适用规则和专题文档，列出读取路径，并说明多区域规则如何合并。
```

预期规则并集：

```text
AGENTS.md
apps/web/AGENTS.md
packages/AGENTS.md
packages/low-code/AGENTS.md
docs/references/logic-editor-original-implementation.md
```

是否读取 migration 或 type-governance 文档取决于任务描述。本提示没有要求迁移或类型治理，因此不应读取。

## 7. Codex CLI 可选测试

桌面端已经能够完成测试，不要求安装或使用 Codex CLI。如果本机已经安装 CLI，可以从仓库根目录启动：

```bash
cd /Users/leojm5/Documents/company/blog-website
codex
```

然后使用第 5 节相同的提示词。不要为了本测试自动安装 Codex CLI。

CLI 测试的通过标准与桌面端相同：以实际文件读取记录为准，而不是只看最终文字说明。

## 8. 证据记录模板

每个用例完成后记录：

```md
### 用例名称

- 测试日期：
- 使用方式：Codex 桌面端 / Codex CLI
- cwd：
- 新会话：是 / 否
- 实际读取的 AGENTS.md：
- 实际读取的 docs 文件：
- 是否读取无关文件：是 / 否
- 是否修改文件：是 / 否
- 结果：通过 / 失败
- 失败现象或备注：
```

建议保留会话或截图，以便失败时区分以下问题：

- 根规则没有被新会话加载。
- 根规则已加载，但 Agent 没有执行主动规则发现。
- 子级规则已读取，但专题文档条件写得过宽。
- 提示词本身同时命中了多个专题条件。

## 9. 总体通过标准

全部满足以下条件，才能认为当前分层路由可用：

1. 静态结构检查全部通过。
2. 从仓库根目录启动，不需要切换子包 cwd。
3. 普通 Package 任务能读取根、`packages` 和当前 Package 三层规则。
4. 应用任务能读取根规则和当前应用规则。
5. 文档任务能读取 `docs/AGENTS.md`，但不会通读 `docs/`。
6. Low-code、Monitoring 和 Runtime Service 能按触发条件读取正确专题文档。
7. 没有读取与任务无关的设计或实施计划。
8. 多区域任务能合并所有适用规则，不会遗漏其中一个区域。
9. 所有“只进行规则发现”的测试都没有修改工作区文件。

## 10. 失败后的处理原则

- 根规则没有加载：确认项目主目录是否为仓库根目录，并新建会话重试。
- 子级规则没有读取：检查根 `AGENTS.md` 的主动发现规则是否仍然存在，并确认提示词给出了明确目标路径。
- 无关文档被读取：收紧对应子级 `AGENTS.md` 的触发条件，不要把整个领域的所有文档列为默认必读。
- 必要文档没有读取：在对应子级 `AGENTS.md` 中补充明确、可判定的触发条件。
- 规则冲突：保留根规则作为全局底线，由更接近目标文件的规则补充细节；任何规则都不能覆盖用户在当前请求中的明确要求。
- 当前会话与新规则不一致：关闭该测试会话并重新创建，不能用旧会话判断新规则是否生效。
