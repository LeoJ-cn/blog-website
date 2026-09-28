import type { SimpleProcessData } from '../../types/process'

/**
 * 生成链路只依赖旧 ProcessPageModel 的 SimpleProcessData XML 序列化逻辑。
 * 方法体保持源实现的遍历顺序与字符串拼接规则。
 */
export default abstract class ProcessPageModel {
  public constructor(_options: Record<string, unknown>) {}

  public abstract getCurrentDataList(): []

  public simpleProcessData2XMLValue(tree: SimpleProcessData): string {
    const { mutation, value } = tree
    let str = ''

    if (mutation) {
      const list: string[] = []
      Object.keys(mutation).forEach((key) => {
        const value = (mutation[key] || '').replace(/"/g, '&quot;')
        list.push(`${key}="${value}"`)
      })
      str += `<mutation ${list.join(' ')}></mutation>`
    }

    if (!value) {
      return str
    }

    Object.keys(value).forEach((key) => {
      const recordValue = value[key]
      if (Array.isArray(recordValue)) {
        const childStr = recordValue
          .reverse()
          .reduce(
            (currentStr: string, child: SimpleProcessData) => this.simpleProcessData2BlockDataXml(child, currentStr),
            '',
          )
        str += `<statement name="${key}">${childStr}</statement>`
      } else if (typeof recordValue === 'object' && recordValue) {
        const child = this.simpleProcessData2BlockDataXml(recordValue, '')
        str += `<value name="${key}">${child}</value>`
      } else if (typeof recordValue === 'string') {
        const field = (recordValue || '').replace(/"/g, '&quot;')
        str += `<field name="${key}">${field}</field>`
      }
    })

    return str
  }

  public simpleProcessData2BlockDataXml(tree: SimpleProcessData, nextStr = ''): string {
    const { value, mutation, ...attrs } = tree
    const attrsStr = Object.keys(attrs)
      .map((key) => (attrs[key as keyof typeof attrs] ? `${key}="${attrs[key as keyof typeof attrs]}"` : ''))
      .filter((item) => item)
      .join(' ')
    const child = this.simpleProcessData2XMLValue(tree)
    return `<block ${attrsStr}>${child}${nextStr ? `<next>${nextStr}</next>` : ''}</block>`
  }
}
