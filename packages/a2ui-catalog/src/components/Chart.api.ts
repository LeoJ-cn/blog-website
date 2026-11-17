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
