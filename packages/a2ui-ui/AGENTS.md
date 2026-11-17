# a2ui-ui Package 规则

- 继承仓库根目录 `AGENTS.md` 与 `packages/AGENTS.md`。
- 本包是本仓库唯一的 React UI 组件实现层，不知道 A2UI 协议存在。
- 禁止 import `@a2ui/*`、禁止 import `@white55/a2ui` 与 `@white55/a2ui-catalog`。
- 第三方库（echarts、@radix-ui/*）只允许在本包声明与 import。
- 所有样式必须只使用 `--a2ui-*` / `--leo-*` CSS 变量，禁止硬编码颜色与间距。
- 禁止 CSS Grid，布局使用 Flexbox。
- 样式只挂在组件自身 class 上，禁止依赖父级后代选择器（A2UI 会插入 custom element 包裹层）。
