# 方案一：仅导出 `549:8646`

目标子树约有 880 个节点，不再读取其所属 Page 的其他兄弟节点。

单次响应限制为 48,000 bytes。100 个节点的布局与样式数据实测约为 163,549 bytes，因此计划按每批 20 个节点导出，预计约 44 次调用。

每批字段包括：

- `id`、`parentId`、`childIds`、`type`、`name`；
- `x`、`y`、`width`、`height`、`rotation`、`absoluteBoundingBox`；
- Auto Layout、Padding、Spacing、Sizing、Alignment、Constraints；
- fills、strokes、effects、opacity、blendMode、cornerRadius；
- Text 内容与字体属性；
- Instance Component Properties；
- Variable bindings。

2026-10-28 新会话中，正式读取仍被 Starter 计划限额阻止。恢复后必须从 offset 0 重新开始，只有 880 个节点全部落盘且引用校验通过，才能标记为完整。
