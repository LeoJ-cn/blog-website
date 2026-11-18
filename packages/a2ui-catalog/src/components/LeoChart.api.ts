import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 图表契约。
 *
 * 设计原则：A2UI 里只注册「定向确定的图表」，一个组件名对应一种固定图形，
 * 不使用 chartType 之类的枚举在单个组件里切换形态。
 *
 * 原因有两层：
 *   1. 协议层：catalog 导出只支持顶层 z.object，一个组件承载多种形态只能靠枚举，
 *      枚举字段对 AI 来说是多一次的判断成本，填错不会有任何报错。
 *   2. 语义层：组件名本身就是给模型的指令。看到 LeoBarChart 就知道画柱状图，
 *      不需要先读枚举说明再决定填 bar 还是 hbar。
 *
 * 底层实现（a2ui-ui 的 LeoChart）仍是可配置的万能组件，供组件库直接使用；
 * 它不会被注册进 catalog。这里每个契约只负责把固定形态翻译成它的参数。
 *
 * 新增图型的改动清单：
 *   1. 本文件加一个 z.object 契约并导出
 *   2. a2ui-ui/src/chart/echarts-registry.ts 注册对应 ECharts 模块
 *   3. a2ui-ui/src/LeoChart.tsx 若需要新 renderer 则加分支
 *   4. a2ui-adapter 加一个适配器，并在 catalog.ts / index.ts 登记
 *   5. a2ui-catalog/scripts/export.ts 的组件清单同步加入
 */

/** 所有图表共用的外观字段。各契约展开复用，避免重复声明。 */
const chartBase = {
  /** 固定高度，像素。 */
  height: z.number().default(240).optional(),
  /** 是否显示图例。 */
  showLegend: z.boolean().default(true).optional(),
  accessibility: CommonSchemas.AccessibilityAttributes.optional(),
}

/**
 * 直角坐标系图表的共用字段：分类轴 + 多系列。
 *
 * bar / hbar / line / area 四者的数据结构完全相同，
 * 差别只在绘制方式与坐标轴方向——这正是由组件名而非字段决定的部分。
 */
const cartesianShape = {
  /** 绑定到 dataModel 中的数组，每项至少含 xField 与 series[].field 指定的键。 */
  data: CommonSchemas.DynamicValue,
  /** 分类轴字段名。 */
  xField: z.string(),
  /** 数据系列。每组对应一组柱子或一条线。 */
  series: z
    .array(
      z.object({
        field: z.string(),
        label: CommonSchemas.DynamicString,
        color: z.string().optional(),
      }),
    )
    .min(1),
  /** 是否在图形上显示数值标签。 */
  showValueLabel: z.boolean().default(false).optional(),
  /**
   * 大数据渲染模式（预防性字段，当前业务数据量在百行以内用不到）。
   *   none     逐点渲染，保留完整 tooltip / hover 交互（默认）
   *   large    启用 ECharts large 模式，跳过逐点命中检测换渲染速度，代价是失去单点 tooltip
   *   sampling 启用 LTTB 降采样 + 渐进渲染，保留趋势拐点的前提下减少绘制点数
   */
  optimize: z.enum(['none', 'large', 'sampling']).default('none').optional(),
  ...chartBase,
}

/** 纵向柱状图。用于比较不同分类的量值。 */
export const LeoBarChartApi = {
  name: 'LeoBarChart',
  schema: z.object(cartesianShape).strict(),
}

/** 横向条形图。分类名较长、或分类数量多时比纵向柱状更易读。 */
export const LeoHBarChartApi = {
  name: 'LeoHBarChart',
  schema: z.object(cartesianShape).strict(),
}

/** 折线图。用于展示随时间或有序分类的趋势变化。 */
export const LeoLineChartApi = {
  name: 'LeoLineChart',
  schema: z.object(cartesianShape).strict(),
}

/** 面积图。折线 + 填充，强调累积量的规模感。 */
export const LeoAreaChartApi = {
  name: 'LeoAreaChart',
  schema: z.object(cartesianShape).strict(),
}

/**
 * 饼图的共用字段：没有坐标轴，数据是「名称 + 数值」的比例项。
 * 因此不需要 xField / series，而是单个 nameField + valueField。
 */
const pieShape = {
  /** 绑定到 dataModel 中的数组，每项至少含 nameField 与 valueField 指定的键。 */
  data: CommonSchemas.DynamicValue,
  /** 分片名称字段名。 */
  nameField: z.string(),
  /** 分片数值字段名。 */
  valueField: z.string(),
  /** 是否在分片上显示名称与百分比。 */
  showLabel: z.boolean().default(true).optional(),
  ...chartBase,
}

/** 饼图。用于展示各部分占整体的比例，分类不宜超过 6 项。 */
export const LeoPieChartApi = {
  name: 'LeoPieChart',
  schema: z.object(pieShape).strict(),
}

/** 环形图。与饼图相同的数据结构，中间挖空，可在圆心放汇总数字。 */
export const LeoRingChartApi = {
  name: 'LeoRingChart',
  schema: z.object(pieShape).strict(),
}

/**
 * 仪表盘。只有一个数值，没有数据集——
 * 因此 value 是单个 DynamicNumber，通常直接绑 dataModel 里的标量路径。
 */
export const LeoGaugeChartApi = {
  name: 'LeoGaugeChart',
  schema: z
    .object({
      /** 当前值，可绑定 dataModel 里的标量路径。 */
      value: CommonSchemas.DynamicNumber,
      /** 量程下限，默认 0。 */
      min: z.number().default(0).optional(),
      /** 量程上限，默认 100。 */
      max: z.number().default(100).optional(),
      /** 仪表盘数值后追加的单位文案，如 "%"、"件/小时"。 */
      unit: z.string().optional(),
      ...chartBase,
    })
    .strict(),
}

/** 契约层导出的类型，供适配层复用，避免各处重复推导。 */
export type CartesianChartContract = z.infer<typeof LeoBarChartApi.schema>
export type PieChartContract = z.infer<typeof LeoPieChartApi.schema>
export type GaugeChartContract = z.infer<typeof LeoGaugeChartApi.schema>
