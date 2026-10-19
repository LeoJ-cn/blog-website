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
] as const

export type UiComponentSlug = (typeof uiComponentSlugs)[number]
