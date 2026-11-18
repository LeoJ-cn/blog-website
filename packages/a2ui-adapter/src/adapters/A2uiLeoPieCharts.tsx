import { LeoPieChartApi, LeoRingChartApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoChart } from '@white55/a2ui-ui'

/**
 * 饼图 / 环形图适配器。
 *
 * 数据是「名称 + 数值」的扁平数组，没有坐标轴概念，
 * 因此不从 xField/series 翻译，而是把两个字段名原样交给实现层。
 * 两个组件字段相同，只在绘制形态上有差别（环形中间挖空）。
 */
export const A2uiLeoPieChart = createComponentImplementation(LeoPieChartApi, ({ props }) => (
  <LeoChart
    kind="pie"
    chartType="pie"
    data={Array.isArray(props.data) ? (props.data as Record<string, unknown>[]) : []}
    nameField={props.nameField}
    valueField={props.valueField}
    showLabel={props.showLabel}
    height={props.height}
    showLegend={props.showLegend}
  />
))

export const A2uiLeoRingChart = createComponentImplementation(LeoRingChartApi, ({ props }) => (
  <LeoChart
    kind="pie"
    chartType="ring"
    data={Array.isArray(props.data) ? (props.data as Record<string, unknown>[]) : []}
    nameField={props.nameField}
    valueField={props.valueField}
    showLabel={props.showLabel}
    height={props.height}
    showLegend={props.showLegend}
  />
))
