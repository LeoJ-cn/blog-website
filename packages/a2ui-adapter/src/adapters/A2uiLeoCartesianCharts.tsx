import {
  LeoBarChartApi,
  LeoHBarChartApi,
  LeoLineChartApi,
  LeoAreaChartApi,
} from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoChart } from '@white55/a2ui-ui'
import type { CartesianChartProps } from '@white55/a2ui-ui'

/**
 * 直角坐标系图表适配器：柱状 / 条形 / 折线 / 面积。
 *
 * 四个组件的字段完全相同，差别只在绘制形态。这里用工厂函数生成，
 * 避免四份逐字重复的适配器代码；每个组件名仍然对应一种固定图形。
 *
 * 适配层只做字段翻译，不写样式、不 import echarts：
 * 绘制细节全部收在 a2ui-ui 的 LeoChart 内部。
 */
function cartesianAdapter(chartType: CartesianChartProps['chartType']) {
  const Chart = ({ props }: {
    props: {
      data: unknown
      xField: string
      series: { field: string; label: unknown; color?: string }[]
      height?: number
      showLegend?: boolean
      showValueLabel?: boolean
      optimize?: CartesianChartProps['optimize']
    }
  }) => (
    <LeoChart
      kind="cartesian"
      chartType={chartType}
      data={Array.isArray(props.data) ? (props.data as Record<string, unknown>[]) : []}
      xField={props.xField}
      series={props.series.map((item) => ({
        field: item.field,
        // 契约里 label 是 DynamicString，解析后可能为 undefined；
        // UI 层要求必有 label，这里退化为空字符串，避免图例出现 "undefined"
        label: typeof item.label === 'string' ? item.label : '',
        color: item.color,
      }))}
      height={props.height}
      showLegend={props.showLegend}
      showValueLabel={props.showValueLabel}
      optimize={props.optimize}
    />
  )
  return Chart
}

export const A2uiLeoBarChart = createComponentImplementation(
  LeoBarChartApi,
  cartesianAdapter('bar'),
)

export const A2uiLeoHBarChart = createComponentImplementation(
  LeoHBarChartApi,
  cartesianAdapter('hbar'),
)

export const A2uiLeoLineChart = createComponentImplementation(
  LeoLineChartApi,
  cartesianAdapter('line'),
)

export const A2uiLeoAreaChart = createComponentImplementation(
  LeoAreaChartApi,
  cartesianAdapter('area'),
)
