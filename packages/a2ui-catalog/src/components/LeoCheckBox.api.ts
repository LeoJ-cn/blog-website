import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

export const LeoCheckBoxApi = {
  name: 'LeoCheckBox',
  schema: z.object({
    label: CommonSchemas.DynamicString.optional(),
    value: CommonSchemas.DynamicBoolean,
    /**
     * 半选态。
     *
     * basic catalog 的 CheckBox 没有这一项，但「父级勾选框」的真实场景需要：
     * 子项部分选中时父级显示横线而非勾。语义上它不等于全选，
     * 读屏器会播报 aria-checked="mixed"。
     */
    indeterminate: CommonSchemas.DynamicBoolean.optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
