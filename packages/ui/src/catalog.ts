/** 路由标识同时供文档和 Playground 使用，新增组件时需同步维护公开入口。 */
export const uiComponentSlugs = [
  'button',
  'input',
  'dialog',
  'loading',
  'empty-state',
  'select',
  'form',
  'table',
  'checkbox',
  'rate',
  'icon',
  'card',
  'avatar',
  'menu',
  'sub-menu',
  'breadcrumb',
  'tabs',
  'dropdown',
  'statistic',
  'trend',
  'progress',
  'list',
  'tooltip',
] as const

export type UiComponentSlug = (typeof uiComponentSlugs)[number]
