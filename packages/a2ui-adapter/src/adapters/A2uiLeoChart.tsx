import { LeoChartApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import {
  LeoChart,
  type ChartKind,
  type ChartSeries,
} from '@white55/a2ui-ui'

export const A2uiLeoChart = createComponentImplementation(
  LeoChartApi,
  ({ props }) => (
    <LeoChart
      kind={props.kind as ChartKind}
      data={Array.isArray(props.data) ? (props.data as Record<string, unknown>[]) : []}
      xField={props.xField}
      series={props.series.map(
        (item): ChartSeries => ({
          field: item.field,
          // 契约里 label 是 DynamicString，解析后可能为 undefined；
          // UI 层要求必有 label，这里退化为空字符串，避免图表图例出现 "undefined"
          label: typeof item.label === 'string' ? item.label : '',
          color: item.color,
        }),
      )}
      height={props.height}
      showLegend={props.showLegend}
      showValueLabel={props.showValueLabel}
      optimize={props.optimize}
    />
  ),
)
