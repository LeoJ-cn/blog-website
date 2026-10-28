/** UiList 使用的最小数据协议；key 仅作为稳定渲染标识，不会展示为内容。 */
export interface UiListItem {
  key: string | number
}

/** compact、default、comfortable 依次增加列表项内边距，不改变内容结构。 */
export type UiListDensity = 'compact' | 'default' | 'comfortable'
