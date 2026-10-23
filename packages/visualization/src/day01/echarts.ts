import { BarChart, LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

// Day01 只注册六个实验实际使用的模块，用最小集合展示 ECharts 按需导入链路。
echarts.use([
  BarChart,
  LineChart,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  CanvasRenderer,
  SVGRenderer,
])

export { echarts }
export type { ECharts, EChartsCoreOption, SetOptionOpts } from 'echarts/core'
