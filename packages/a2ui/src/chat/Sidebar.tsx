import { useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { NAV_GROUPS } from './nav'

/**
 * 可折叠的二级导航侧边栏。
 *
 * 两种形态：
 *   展开 —— 显示分组、图标与文字，宽度 240px
 *   收起 —— 只显示图标，宽度 56px；文字通过 title 属性的原生 tooltip 悬浮显示
 *
 * 收起状态存在 URL（?nav=collapsed），刷新和前进后退都能恢复。
 * 选中态用 NavLink 自带的 isActive 判断，不额外维护一份「当前 key」。
 */
export function Sidebar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const collapsed = searchParams.get('nav') === 'collapsed'
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'component-demos': true,
  })

  const setCollapsed = (next: boolean) => {
    const params = new URLSearchParams(searchParams)
    // 展开是默认态，不写参数，URL 保持干净
    if (next) params.set('nav', 'collapsed')
    else params.delete('nav')
    setSearchParams(params, { replace: true })
  }

  const toggleGroup = (key: string) => {
    if (collapsed) {
      // 收起状态下点父项：先展开侧边栏，再展开分组，避免「点了没反应」
      setCollapsed(false)
      setExpanded((prev) => ({ ...prev, [key]: true }))
      return
    }
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <nav className={`nav${collapsed ? ' nav--collapsed' : ''}`} aria-label="主导航">
      <button
        type="button"
        className="nav__toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        <span className="nav__icon" aria-hidden="true">
          {collapsed ? '»' : '«'}
        </span>
        {!collapsed && <span className="nav__text">收起</span>}
      </button>

      {NAV_GROUPS.map((group) => (
        <section key={group.key} className="nav__group">
          {!collapsed && <h2 className="nav__group-title">{group.title}</h2>}
          <ul className="nav__list">
            {group.items.map((item) => {
              // 有子项且处于展开形态：渲染成可折叠的分组标题
              if (item.children && !collapsed) {
                return (
                  <li key={item.key} className="nav__item">
                    <button
                      type="button"
                      className="nav__parent"
                      aria-expanded={!!expanded[item.key]}
                      onClick={() => toggleGroup(item.key)}
                    >
                      <span className="nav__icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="nav__text">{item.label}</span>
                      <span className="nav__caret" aria-hidden="true">
                        {expanded[item.key] ? '▾' : '▸'}
                      </span>
                    </button>
                    {expanded[item.key] && (
                      <ul className="nav__sublist">
                        {item.children.map((child) => (
                          <li key={child.key}>
                            <NavLink
                              to={child.path ?? '/'}
                              className={({ isActive }) =>
                                `nav__link${isActive ? ' nav__link--active' : ''}`
                              }
                              title={collapsed ? child.label : undefined}
                            >
                              <span className="nav__icon" aria-hidden="true">
                                {child.icon}
                              </span>
                              <span className="nav__text">{child.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              }

              return (
                <li key={item.key} className="nav__item">
                  <NavLink
                    to={item.path ?? '/'}
                    className={({ isActive }) =>
                      `nav__link${isActive ? ' nav__link--active' : ''}`
                    }
                    title={item.label}
                  >
                    <span className="nav__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="nav__text">{item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </nav>
  )
}
