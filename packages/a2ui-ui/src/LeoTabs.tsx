import { useId, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import './LeoTabs.css'

export interface LeoTabItem {
  /** 标签标题 */
  title: string
  /** 标识，用于关联内容面板；不传时按索引生成 */
  value?: string
  content: React.ReactNode
}

export interface LeoTabsProps {
  items: LeoTabItem[]
  /** 受控的当前标签；不传则非受控 */
  value?: string
  onChange?: (value: string) => void
}

/**
 * 基于 Radix Tabs 的标签页。
 *
 * 用 Radix 而不是手写按钮组：Tabs 需要 roving tabindex、方向键切换、
 * aria-controls/labelledby 的双向关联，手写很容易漏掉其中几项，
 * 而读屏器用户依赖这些属性才能正确导航。
 */
export function LeoTabs({ items, value, onChange }: LeoTabsProps) {
  const id = useId()
  const [internal, setInternal] = useState(items[0]?.value ?? '0')
  const current = value ?? internal

  const keyOf = (item: LeoTabItem, index: number) => item.value ?? String(index)

  return (
    <Tabs.Root
      className="leo-tabs"
      value={current}
      onValueChange={(next) => {
        setInternal(next)
        onChange?.(next)
      }}
    >
      <Tabs.List className="leo-tabs__list" aria-label="标签页">
        {items.map((item, index) => (
          <Tabs.Trigger
            key={keyOf(item, index)}
            value={keyOf(item, index)}
            className="leo-tabs__trigger"
          >
            {item.title}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((item, index) => (
        <Tabs.Content
          key={`${id}-${keyOf(item, index)}`}
          value={keyOf(item, index)}
          className="leo-tabs__panel"
        >
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
