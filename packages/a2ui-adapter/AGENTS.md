# a2ui-adapter Package 规则

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md`。
- 本包是 A2UI 协议与 `@white55/a2ui-ui` 之间的唯一桥梁：把契约层的 Zod schema 翻译成 UI 库的组件 props。
- 依赖方向固定为 `a2ui-adapter → a2ui-catalog` + `a2ui-ui`；反向依赖禁止。
- `a2ui-ui` 保持不认识 A2UI 协议；本包是唯一允许同时 import 两者与 `@a2ui/*` 的地方。
- 适配器只做字段翻译，禁止写样式、禁止 import `echarts` / `@radix-ui/*`。
- 新增一个接入组件时，必须同步更新 `src/catalog.ts` 的 `selfBuilt` 与 `OVERRIDDEN`，并由开发期断言校验一致性。
- `@a2ui/react` 与 `@a2ui/web_core` 只经 `src/protocol.ts` 引入，其余文件禁止直接 import。
