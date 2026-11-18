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

  // 主题切换时 CSS 变量变了，但已渲染的 canvas 不会自动重绘
  useEffect(() => {
    const observer = new MutationObserver(() => {
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

function readVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/** 当前主题下的一组画布颜色。每次 toOption 重新读取，保证主题切换后取到新值。 */
function themeColors() {
  return {
    text: readVar('--a2ui-color-on-surface', '#1f1f1f'),
    border: readVar('--a2ui-color-border', '#e5e5e5'),
    brand: readVar('--a2ui-color-primary', '#1a73e8'),
    surface: readVar('--a2ui-color-surface', '#fff'),
  }
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
  const { text, border, brand } = themeColors()

  const categoryAxis = {
    type: 'category' as const,
    data: rows.map((row) => String(row[p.xField] ?? '')),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: border } },
    axisLabel: { color: text },
  }

  const valueAxis = {
    type: 'value' as const,
    splitLine: { lineStyle: { color: border } },
    axisLabel: { color: text },
  }

  return {
    animation: false,
    // 横条图只需对调两个轴
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    tooltip: { trigger: 'axis' },
    legend:
      p.showLegend === false ? undefined : { bottom: 0, textStyle: { color: text } },
    grid: {
      left: 48,
      right: 16,
      top: 16,
      bottom: p.showLegend === false ? 24 : 48,
      // ECharts 6 弃用 containLabel，改用 outerBounds。
      // 语义等价于原来的 containLabel: true —— 让坐标轴标签不被 grid 边距裁掉。
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    series: p.series.map((s, index) => ({
      type: isLineLike ? 'line' : 'bar',
      name: typeof s.label === 'string' ? s.label : String(s.label ?? ''),
      data: rows.map((row) => Number(row[s.field] ?? 0)),
      smooth: isLineLike,
      areaStyle: p.chartType === 'area' ? {} : undefined,
      itemStyle: { color: s.color ?? (index === 0 ? brand : undefined) },
      label: p.showValueLabel
        ? { show: true, position: 'top', color: text }
        : undefined,
      barMaxWidth: 32,
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
    })),
  }
}

function pieOption(p: PieChartProps): EChartsCoreOption {
  const rows = Array.isArray(p.data) ? p.data : []
  const { text, brand, surface } = themeColors()
  const isRing = p.chartType === 'ring'

  return {
    animation: false,
    tooltip: { trigger: 'item' },
    legend:
      p.showLegend === false
        ? undefined
        : { bottom: 0, textStyle: { color: text } },
    // 环形图靠 innerRadius 挖空，比额外配置 radius 数组更直观
    series: [
      {
        type: 'pie',
        radius: isRing ? ['45%', '70%'] : '65%',
        center: ['50%', '48%'],
        itemStyle: { borderColor: surface, borderWidth: 2 },
        label: p.showLabel === false ? { show: false } : { color: text },
        data: rows.map((row) => ({
          name: String(row[p.nameField] ?? ''),
          value: Number(row[p.valueField] ?? 0),
        })),
        // 首个分片用品牌色，其余交给 ECharts 默认调色板
        color: undefined,
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: brand } },
      },
    ],
  }
}

function gaugeOption(p: GaugeChartProps): EChartsCoreOption {
  const { text, brand, border } = themeColors()
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
        progress: { show: true, width: 12, itemStyle: { color: brand } },
        axisLine: { lineStyle: { width: 12, color: [[1, border]] } },
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
