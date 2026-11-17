import { useEffect, useRef } from 'react'
import type { EChartsType, EChartsCoreOption } from 'echarts/core'
import { echarts } from './chart/echarts-registry'

export const CHART_KINDS = ['bar', 'hbar', 'line', 'area'] as const
export type ChartKind = (typeof CHART_KINDS)[number]

export interface ChartSeries {
  field: string
  label: string
  color?: string
}

export interface ChartProps {
  kind: ChartKind
  data: Record<string, unknown>[]
  xField: string
  series: ChartSeries[]
  height?: number
  showLegend?: boolean
  showValueLabel?: boolean
  optimize?: 'none' | 'large' | 'sampling'
}

export function A2uiChartComponent(props: ChartProps) {
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

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption(toOption(props), { notMerge: true })
  }, [
    props.kind,
    props.data,
    props.xField,
    props.series,
    props.showLegend,
    props.showValueLabel,
    props.optimize,
  ])

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

// A2UI 声明 -> ECharts option 的唯一转换点
function toOption(p: ChartProps): EChartsCoreOption {
  const rows = Array.isArray(p.data) ? p.data : []
  const isHorizontal = p.kind === 'hbar'
  const isLineLike = p.kind === 'line' || p.kind === 'area'

  const textColor = readVar('--a2ui-color-on-surface', '#1f1f1f')
  const borderColor = readVar('--a2ui-color-border', '#e5e5e5')
  const brandColor = readVar('--a2ui-color-primary', '#1a73e8')

  const categoryAxis = {
    type: 'category' as const,
    data: rows.map((row) => String(row[p.xField] ?? '')),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: borderColor } },
    axisLabel: { color: textColor },
  }

  const valueAxis = {
    type: 'value' as const,
    splitLine: { lineStyle: { color: borderColor } },
    axisLabel: { color: textColor },
  }

  return {
    animation: false,
    // 横条图只需对调两个轴
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    tooltip: { trigger: 'axis' },
    legend:
      p.showLegend === false
        ? undefined
        : { bottom: 0, textStyle: { color: textColor } },
    grid: {
      left: 48,
      right: 16,
      top: 16,
      bottom: p.showLegend === false ? 24 : 48,
      containLabel: true,
    },
    series: p.series.map((s, index) => ({
      type: isLineLike ? 'line' : 'bar',
      name: typeof s.label === 'string' ? s.label : String(s.label ?? ''),
      data: rows.map((row) => Number(row[s.field] ?? 0)),
      smooth: isLineLike,
      areaStyle: p.kind === 'area' ? {} : undefined,
      itemStyle: { color: s.color ?? (index === 0 ? brandColor : undefined) },
      label: p.showValueLabel
        ? { show: true, position: 'top', color: textColor }
        : undefined,
      barMaxWidth: 32,
      // 大数据渲染模式。当前业务数据量用不到，保留为契约层的预防性能力，
      // 避免将来出现万级数据时要改契约与后端 prompt。
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
