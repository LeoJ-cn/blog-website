import { useEffect, useRef } from 'react'
import type { EChartsType, EChartsCoreOption } from 'echarts/core'
import { echarts } from './chart/echarts-registry'

/**
 * 图表实现层。
 *
 * 与契约层的分工：契约层只描述「有什么字段」，这里负责「字段怎么变成 ECharts option」。
 * 每个 kind 一个 renderer 函数，互不影响——新增图型只需加一个分支，
 * 不会触碰既有图型的渲染逻辑。
 */

/** 所有图表共用的外观参数。 */
interface ChartBaseProps {
  height?: number
  showLegend?: boolean
}

export const CARTESIAN_CHART_TYPES = ['bar', 'hbar', 'line', 'area'] as const
export type CartesianChartType = (typeof CARTESIAN_CHART_TYPES)[number]

export interface ChartSeries {
  field: string
  label: string
  color?: string
}

/** 直角坐标系：柱状 / 条形 / 折线 / 面积。 */
export interface CartesianChartProps extends ChartBaseProps {
  kind: 'cartesian'
  chartType: CartesianChartType
  data: Record<string, unknown>[]
  xField: string
  series: ChartSeries[]
  showValueLabel?: boolean
  optimize?: 'none' | 'large' | 'sampling'
}

/** 饼图 / 环形图：没有坐标轴，数据是「名称 + 数值」。 */
export interface PieChartProps extends ChartBaseProps {
  kind: 'pie'
  chartType?: 'pie' | 'ring'
  data: Record<string, unknown>[]
  nameField: string
  valueField: string
  showLabel?: boolean
}

/** 仪表盘：单个标量值 + 量程。 */
export interface GaugeChartProps extends ChartBaseProps {
  kind: 'gauge'
  value: number
  min?: number
  max?: number
  unit?: string
}

export type LeoChartProps = CartesianChartProps | PieChartProps | GaugeChartProps

export function LeoChart(props: LeoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // React 19 的 useRef 要求显式初值，这里用 undefined 表示「尚未 init」
  const chartRef = useRef<EChartsType | undefined>(undefined)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const instance = echarts.init(el)
    chartRef.current = instance

    // ECharts 不跟随容器尺寸；隐藏容器（Modal / 非激活 Tab）宽度为 0 时 resize 也无意义
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0) instance.resize()
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      instance.dispose()
      chartRef.current = undefined
    }
  }, [])

  // kind 变化时结构完全不同，用 notMerge 全量替换，避免旧图的 series 残留
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption(toOption(props), { notMerge: true })
  }, [props])

  // 主题切换时 CSS 变量变了，但已渲染的 canvas 不会自动重绘。
  // 失效缓存必须发生在重绘之前，否则 toOption 会读到上一套颜色。
  useEffect(() => {
    const observer = new MutationObserver(() => {
      invalidateChartThemeCache()
      chartRef.current?.setOption(toOption(props), { notMerge: true })
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [props])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: props.height ?? 240 }}
    />
  )
}

/** 一次主题读取的完整结果。字段与下方 themeColors 的返回值一一对应。 */
interface ChartTheme {
  text: string
  border: string
  brand: string
  surface: string
  series: string[]
  axisLine: string
  splitLine: string
  splitLineType: 'solid' | 'dashed' | 'dotted'
  splitLineWidth: number
  lineWidth: number
  symbolSize: number
  barMaxWidth: number
  barRadius: number
  areaTop: number
  areaBottom: number
  axisFontSize: number
  legendFontSize: number
  labelFontSize: number
  labelDistance: number
  gridLeft: number
  gridRight: number
  gridTop: number
  gridBottom: number
  gridBottomLegend: number
  legendBottom: number
  legendIconSize: number
  defaultHeight: number
  tooltipBg: string
  tooltipBorder: string
  tooltipRadius: number
  tooltipPadding: number
  pieBorderColor: string
  pieBorderWidth: number
  emphasisBlur: number
  gaugeAxisWidth: number
}

/**
 * 主题缓存。
 *
 * 为什么要缓存：一次 themeColors 要读 38 个自定义属性，
 * 而 getComputedStyle 本身会触发样式重算。页面上每个图表实例在
 * props 变化时都会调一次，多图叠加后开销可观；稳态下主题又不会变。
 *
 * 失效时机：只有 [data-theme] 变化时才需要重算，由下面的
 * invalidateThemeCache 负责。缓存值为 null 表示下次调用要重新读取。
 */
let themeCache: ChartTheme | null = null

/**
 * 作废主题缓存。
 *
 * 必须在主题切换后、图表重绘前调用；useTheme 或图表的
 * MutationObserver 都可以作为调用点（幂等，重复调用无副作用）。
 */
export function invalidateChartThemeCache(): void {
  themeCache = null
}

/**
 * 读取当前主题下的图表样式值，结果按主题缓存。
 *
 * 只在缓存失效时访问 getComputedStyle，且**整组只读一次快照**：
 * 38 个属性全部从同一份 CSSStyleDeclaration 取，避免重复触发样式重算。
 *
 * 数值型（线宽、字号、间距）用 readNum 转换：ECharts 需要 number，
 * 而 CSS 自定义属性拿到的是带单位的字符串（"2px"）。
 */
function themeColors(): ChartTheme {
  if (themeCache) return themeCache

  // 单次快照：后续所有读取都复用这份声明，不再触发样式计算
  const style = getComputedStyle(document.documentElement)
  const raw = (name: string) => style.getPropertyValue(name).trim()
  const v = (name: string, fallback: string) => raw(name) || fallback
  const n = (name: string, fallback: number) => {
    const parsed = Number.parseFloat(raw(name))
    return Number.isFinite(parsed) ? parsed : fallback
  }

  themeCache = {
    text: v('--a2ui-color-on-surface', '#1f1f1f'),
    border: v('--a2ui-color-border', '#e5e5e5'),
    brand: v('--a2ui-color-primary', '#1a73e8'),
    surface: v('--a2ui-color-surface', '#fff'),

    // ---- 系列色板：后端不传 color 时按索引取用 ----
    series: [1, 2, 3, 4, 5].map((i) => v(`--leo-chart-${i}`, '#999')),

    // ---- 线条与网格 ----
    axisLine: v('--leo-chart-axis-line', '#e5e5e5'),
    splitLine: v('--leo-chart-split-line', '#e5e5e5'),
    splitLineType: v('--leo-chart-split-line-type', 'dashed') as 'solid' | 'dashed' | 'dotted',
    splitLineWidth: n('--leo-chart-split-line-width', 1),
    lineWidth: n('--leo-chart-line-width', 2),
    symbolSize: n('--leo-chart-symbol-size', 6),
    barMaxWidth: n('--leo-chart-bar-max-width', 32),
    barRadius: n('--leo-chart-bar-radius', 4),

    // ---- 面积渐变：不透明度，运行时与系列色组合 ----
    areaTop: n('--leo-chart-area-fill-top', 0.32),
    areaBottom: n('--leo-chart-area-fill-bottom', 0.02),

    // ---- 文字 ----
    axisFontSize: n('--leo-chart-axis-font-size', 12),
    legendFontSize: n('--leo-chart-legend-font-size', 12),
    labelFontSize: n('--leo-chart-label-font-size', 11),
    labelDistance: n('--leo-chart-label-distance', 6),

    // ---- 布局 ----
    gridLeft: n('--leo-chart-grid-left', 48),
    gridRight: n('--leo-chart-grid-right', 16),
    gridTop: n('--leo-chart-grid-top', 16),
    gridBottom: n('--leo-chart-grid-bottom', 24),
    gridBottomLegend: n('--leo-chart-grid-bottom-with-legend', 48),
    legendBottom: n('--leo-chart-legend-bottom', 0),
    legendIconSize: n('--leo-chart-legend-icon-size', 10),
    defaultHeight: n('--leo-chart-height', 240),

    // ---- Tooltip ----
    tooltipBg: v('--leo-chart-tooltip-bg', '#fff'),
    tooltipBorder: v('--leo-chart-tooltip-border', '#e5e5e5'),
    tooltipRadius: n('--leo-chart-tooltip-radius', 6),
    tooltipPadding: n('--leo-chart-tooltip-padding', 8),

    // ---- 饼图 ----
    pieBorderColor: v('--leo-chart-pie-border-color', '#fff'),
    pieBorderWidth: n('--leo-chart-pie-border-width', 2),
    emphasisBlur: n('--leo-chart-emphasis-shadow-blur', 8),

    // ---- 仪表盘 ----
    gaugeAxisWidth: n('--leo-chart-gauge-axis-width', 12),
  }

  return themeCache
}

/**
 * 把系列色按透明度转成 rgba。
 *
 * 面积图的渐变需要在同一个系列色上叠两个透明度，
 * 而 CSS 变量给到的是 hex，ECharts 的 LinearGradient 只接受色值字符串。
 */
function withAlpha(color: string, alpha: number): string {
  const hex = color.trim()
  // 只处理 #rgb / #rrggbb；其它写法（rgb()、颜色关键字）原样返回，避免算出错误值
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 取第 index 个系列色；越界时回落到第一个，保证总有颜色可用。 */
function seriesColor(colors: ChartTheme, index: number): string {
  return colors.series[index] ?? colors.series[0] ?? colors.brand
}

// A2UI 声明 -> ECharts option 的唯一转换点。按 kind 分派到各自的 renderer。
function toOption(p: LeoChartProps): EChartsCoreOption {
  switch (p.kind) {
    case 'cartesian':
      return cartesianOption(p)
    case 'pie':
      return pieOption(p)
    case 'gauge':
      return gaugeOption(p)
  }
}

function cartesianOption(p: CartesianChartProps): EChartsCoreOption {
  const rows = Array.isArray(p.data) ? p.data : []
  const isHorizontal = p.chartType === 'hbar'
  const isLineLike = p.chartType === 'line' || p.chartType === 'area'
  const c = themeColors()
  const { text } = c

  const categoryAxis = {
    type: 'category' as const,
    data: rows.map((row) => String(row[p.xField] ?? '')),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: c.axisLine } },
    axisLabel: { color: text, fontSize: c.axisFontSize },
  }

  const valueAxis = {
    type: 'value' as const,
    splitLine: {
      // 虚线比实线轻，让数据本身更突出
      lineStyle: { color: c.splitLine, type: c.splitLineType, width: c.splitLineWidth },
    },
    axisLabel: { color: text, fontSize: c.axisFontSize },
  }

  return {
    animation: false,
    // 横条图只需对调两个轴
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    tooltip: {
      trigger: 'axis',
      // 默认 tooltip 是白底黑字，深色主题下会突兀，这里跟卡片同源
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      borderRadius: c.tooltipRadius,
      padding: c.tooltipPadding,
      textStyle: { color: text, fontSize: c.axisFontSize },
    },
    legend:
      p.showLegend === false
        ? undefined
        : {
            bottom: c.legendBottom,
            textStyle: { color: text, fontSize: c.legendFontSize },
            // 圆角色块比默认的方块更柔和，且与卡片的圆角语言一致
            icon: 'roundRect',
            itemWidth: c.legendIconSize,
            itemHeight: c.legendIconSize,
          },
    grid: {
      left: c.gridLeft,
      right: c.gridRight,
      top: c.gridTop,
      bottom: p.showLegend === false ? c.gridBottom : c.gridBottomLegend,
      // ECharts 6 弃用 containLabel，改用 outerBounds。
      // 语义等价于原来的 containLabel: true —— 让坐标轴标签不被 grid 边距裁掉。
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    series: p.series.map((s, index) => {
      // 后端不传 color 时按索引取系列色板，保证多系列之间可区分且与主题同源
      const color = s.color ?? seriesColor(c, index)
      return {
        type: isLineLike ? 'line' : 'bar',
        name: typeof s.label === 'string' ? s.label : String(s.label ?? ''),
        data: rows.map((row) => Number(row[s.field] ?? 0)),
        smooth: isLineLike,
        // 折线图加标记点，让数据落点可辨；面积图省略以免与填充糊在一起
        symbol: isLineLike && p.chartType === 'line' ? 'circle' : undefined,
        symbolSize: isLineLike && p.chartType === 'line' ? c.symbolSize : undefined,
        lineStyle: isLineLike ? { width: c.lineWidth } : undefined,
        areaStyle:
          p.chartType === 'area'
            ? {
                // 顶深底浅的垂直渐变，避免整块实色压过其它内容
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: withAlpha(color, c.areaTop) },
                  { offset: 1, color: withAlpha(color, c.areaBottom) },
                ]),
              }
            : undefined,
        itemStyle: {
          color,
          // 只圆上两角：贴住基线的下两角保持直角，柱形才「站得住」
          borderRadius: isHorizontal
            ? [0, c.barRadius, c.barRadius, 0]
            : [c.barRadius, c.barRadius, 0, 0],
        },
        label: p.showValueLabel
          ? {
              show: true,
              position: 'top',
              color: text,
              fontSize: c.labelFontSize,
              distance: c.labelDistance,
            }
          : undefined,
        barMaxWidth: c.barMaxWidth,
        // 大数据渲染模式。当前业务数据量用不到，保留为契约层的预防性能力。
        ...(p.optimize === 'large'
          ? {
              // large 模式批量绘制，跳过逐点命中检测；代价是失去单点 tooltip。
              large: true,
              largeThreshold: 2000,
            }
          : {}),
        ...(p.optimize === 'sampling'
          ? {
              // LTTB 降采样保留趋势拐点，progressive 分帧渲染避免主线程长时间阻塞。
              sampling: 'lttb',
              progressive: 400,
              progressiveThreshold: 3000,
            }
          : {}),
      }
    }),
  }
}

function pieOption(p: PieChartProps): EChartsCoreOption {
  const rows = Array.isArray(p.data) ? p.data : []
  const c = themeColors()
  const { text } = c
  const isRing = p.chartType === 'ring'

  return {
    animation: false,
    tooltip: {
      trigger: 'item',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      borderRadius: c.tooltipRadius,
      padding: c.tooltipPadding,
      textStyle: { color: text, fontSize: c.axisFontSize },
    },
    legend:
      p.showLegend === false
        ? undefined
        : {
            bottom: c.legendBottom,
            textStyle: { color: text, fontSize: c.legendFontSize },
            icon: 'roundRect',
            itemWidth: c.legendIconSize,
            itemHeight: c.legendIconSize,
          },
    // 环形图靠 innerRadius 挖空，比额外配置 radius 数组更直观
    series: [
      {
        type: 'pie',
        radius: isRing ? ['45%', '70%'] : '65%',
        center: ['50%', '48%'],
        // 整组系列色交给饼图，避免出现与主题不搭的默认调色板配色
        color: c.series,
        itemStyle: { borderColor: c.pieBorderColor, borderWidth: c.pieBorderWidth },
        label: p.showLabel === false ? { show: false } : { color: text, fontSize: c.labelFontSize },
        data: rows.map((row) => ({
          name: String(row[p.nameField] ?? ''),
          value: Number(row[p.valueField] ?? 0),
        })),
        // 悬停时用主色做柔和外发光，不用阴影硬边
        emphasis: { itemStyle: { shadowBlur: c.emphasisBlur, shadowColor: c.brand } },
      },
    ],
  }
}

function gaugeOption(p: GaugeChartProps): EChartsCoreOption {
  const c = themeColors()
  const { text, brand, border } = c
  const min = p.min ?? 0
  const max = p.max ?? 100
  const value = Number(p.value)
  const safeValue = Number.isFinite(value) ? value : min

  return {
    animation: false,
    series: [
      {
        type: 'gauge',
        min,
        max,
        // 从 min 到当前值的进度弧用品牌色，剩余轨道用边框色
        progress: { show: true, width: c.gaugeAxisWidth, itemStyle: { color: brand } },
        axisLine: { lineStyle: { width: c.gaugeAxisWidth, color: [[1, border]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        detail: {
          valueAnimation: false,
          offsetCenter: [0, 0],
          fontSize: 28,
          fontWeight: 600,
          color: text,
          formatter: p.unit ? `{value}${p.unit}` : '{value}',
        },
        data: [{ value: safeValue }],
      },
    ],
  }
}
