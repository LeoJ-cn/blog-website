import { useEffect, useRef, useState } from 'react'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import type { ColumnDefinition, RowComponent } from 'tabulator-tables'
import 'tabulator-tables/dist/css/tabulator.css'
import './LeoTable.css'

export interface LeoTableColumn {
  /** 数据行的键名 */
  field: string
  /** 表头文案 */
  label: string
  /** 列宽，像素。缺省时由 layout 均分 */
  width?: number
  /** 横向对齐，默认 start */
  align?: 'start' | 'center' | 'end'
  /** 是否可排序 */
  sortable?: boolean
  /**
   * 单元格格式。
   *
   * 枚举而非函数，因为契约层只能表达 JSON——适配层把枚举翻成 Tabulator 的 formatter。
   * 新增格式时：这里加成员、下方 FORMATTERS 加实现，两处必须同步。
   */
  format?: 'text' | 'money' | 'percent' | 'date'
}

export interface LeoTableProps {
  columns: LeoTableColumn[]
  rows: Record<string, unknown>[]
  /** 固定表体高度，像素。有值时表头吸顶、表体滚动 */
  height?: number
  /** 斑马纹 */
  stripe?: boolean
  /** 空数据提示 */
  emptyText?: string
  /** 行点击回调；传了才允许点击行 */
  onRowClick?: (row: Record<string, unknown>) => void
}

const ALIGN_MAP = {
  start: 'left',
  center: 'center',
  end: 'right',
} as const

/**
 * 列定义翻译：A2UI 语义 -> Tabulator 字段。
 *
 * 只做字段名与枚举的映射，不承担样式职责（样式在 LeoTable.css）。
 */
function toColumnDefinitions(columns: LeoTableColumn[]): ColumnDefinition[] {
  return columns.map((column) => ({
    field: column.field,
    title: column.label,
    width: column.width,
    hozAlign: ALIGN_MAP[column.align ?? 'start'],
    // Tabulator 的可排序列选项叫 headerSort，不是 sortable；
    // 写成 sortable 会被当成未知选项忽略，表头点击无任何反应
    headerSort: column.sortable ?? false,
    formatter: column.format ? FORMATTERS[column.format] : undefined,
  }))
}

/**
 * 单元格格式化实现。
 *
 * Tabulator 的 formatter 返回 HTML 字符串或 DOM 元素，拿不到 React 节点，
 * 所以这里只产出纯文本/简单标记，样式由 CSS 类承担。
 */
const FORMATTERS = {
  text: (cell: { getValue(): unknown }) => String(cell.getValue() ?? ''),
  money: (cell: { getValue(): unknown }) => {
    const value = Number(cell.getValue())
    if (!Number.isFinite(value)) return ''
    // 千分位 + 两位小数，货币符号由调用方决定是否放进表头
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  },
  percent: (cell: { getValue(): unknown }) => {
    const value = Number(cell.getValue())
    return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : ''
  },
  date: (cell: { getValue(): unknown }) => {
    const raw = cell.getValue()
    if (!raw) return ''
    const date = new Date(String(raw))
    if (Number.isNaN(date.getTime())) return String(raw)
    return date.toLocaleDateString('zh-CN')
  },
} as const

export function LeoTable({
  columns,
  rows,
  height,
  stripe,
  emptyText,
  onRowClick,
}: LeoTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<Tabulator | undefined>(undefined)
  // 回调放 ref：避免 onRowClick 每次渲染换引用时重建整个表格实例
  const rowClickRef = useRef(onRowClick)
  rowClickRef.current = onRowClick

  // 只在挂载时初始化一次。columns/rows 的后续变化由下方两个 effect 增量更新，
  // 若把它们放进依赖数组，每次渲染生成的新数组都会重建整个表格实例。
  //
  // 就绪信号用 tableBuilt：构造函数返回时实例内部 element 仍是 null，
  // 此时调用 setColumns / replaceData 会抛 "reading 'firstChild' of null"；
  // 而 tableBuilt 在首次渲染完成后才触发，是官方推荐的时序。
  const [built, setBuilt] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const instance = new Tabulator(el, {
      data: rows,
      columns: toColumnDefinitions(columns),
      height,
      layout: 'fitColumns',
      placeholder: emptyText ?? '暂无数据',
    })
    tableRef.current = instance

    // 行点击必须用 on 订阅，不能写在构造参数里：
    // 构造参数中的回调不会被 ExternalEventBus 自动注册（源码只认 on/off），
    // 放在 options 里等于什么都不会发生。
    const onRowClick = (_e: unknown, row: RowComponent) => {
      rowClickRef.current?.(row.getData())
    }
    instance.on('rowClick', onRowClick as (...args: unknown[]) => void)

    const onBuilt = () => setBuilt(true)
    instance.on('tableBuilt', onBuilt)

    // 容器尺寸变化后 Tabulator 不会自动重算，需要手动 redraw
    const observer = new ResizeObserver(() => instance.redraw())
    observer.observe(el)

    return () => {
      observer.disconnect()
      instance.off('tableBuilt', onBuilt)
      instance.off('rowClick', onRowClick as (...args: unknown[]) => void)
      instance.destroy()
      tableRef.current = undefined
      setBuilt(false)
    }
  }, [])

  // 数据更新：必须用 replaceData 而非 setData，
  // 后者会重置排序与滚动位置，用户正在看的视图会被打断。
  useEffect(() => {
    // built 之前不调用：构造函数的 data 已经灌过一遍，此时实例尚未就绪
    if (!built) return
    void tableRef.current?.replaceData(rows)
  }, [rows, built])

  // 列定义变化时整体重建列，保留数据与排序状态
  useEffect(() => {
    if (!built) return
    tableRef.current?.setColumns(toColumnDefinitions(columns))
  }, [columns, built])

  return <div ref={containerRef} className={stripe ? 'leo-table leo-table--stripe' : 'leo-table'} />
}
