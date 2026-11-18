import { LeoGaugeChartApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoChart } from '@white55/a2ui-ui'

/**
 * 仪表盘适配器。
 *
 * value 在契约里是 DynamicNumber，正常情况下解析后已是 number；
 * 但绑定路径指向缺失数据时可能仍是对象或 undefined，此时退化为量程下限，
 * 避免把 NaN 画到仪表盘上。
 */
export const A2uiLeoGaugeChart = createComponentImplementation(
  LeoGaugeChartApi,
  ({ props }) => (
    <LeoChart
      kind="gauge"
      value={typeof props.value === 'number' ? props.value : (props.min ?? 0)}
      min={props.min}
      max={props.max}
      unit={props.unit}
      height={props.height}
      showLegend={props.showLegend}
    />
  ),
)
