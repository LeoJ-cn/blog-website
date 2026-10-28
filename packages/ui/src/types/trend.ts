/** 趋势方向不必与数值符号一致，显式值用于表达具体业务语义。 */
export type UiTrendDirection = 'up' | 'down' | 'flat'

/** percent 与 number 使用内置格式；函数会收到未经转换的原始数值。 */
export type UiTrendFormat = 'percent' | 'number' | ((value: number) => string)
