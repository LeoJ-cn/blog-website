import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

/**
 * 按需注册 ECharts 模块。
 *
 * 新增图型时必须在这里同步 use 对应模块，否则 setOption 会静默渲染空白画布
 * （ECharts 不会对未注册的 series.type 报错，只是画不出来）。
 */
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

export { echarts }
