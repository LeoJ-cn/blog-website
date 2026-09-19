const ProgressBar = require('progress')

export * from './assertNever'
export * from './getSyntaxKindName'

export const cliModuleName = '[TsxToSchema]'

export const getBaseMsg = (msg: string) => {
  return `${cliModuleName} ${msg}`
}

export const cusLog = (module: string, msg: string = '') => {
  console.log(`${cliModuleName}-[${module}]${msg ? '-' + msg : ''}`)
}

export interface ProcessPayload_Interface {
  /**
   * 总项
   */
  total: number
  /**
   * 名称
   */
  title?: string
  /**
   * 进度条宽度
   */
  width?: number
  /**
   * 已完成的字符
   */
  complete?: string
  /**
   * 未完成的字符
   */
  incomplete?: string
}
export class CustomProcess {
  instance: any
  total: number
  title: string
  width: number

  constructor(process_payload: ProcessPayload_Interface) {
    const {
      total = 100,
      width = 100,
      title = 'process',
      complete = '+',
      incomplete = '-',
    } = process_payload
    this.total = total
    this.title = title
    this.width = width
    this.instance = new ProgressBar(':title [:bar] :percent/[:total]', {
      complete,
      incomplete,
      width,
      total,
    })
  }
  tick(num: number = 1, title: string = this.title) {
    this.instance.tick(num, { title: `${cliModuleName}-[${title}]` })
    if (this.instance.curr > this.total) {
      this.instance.terminate()
    }
  }
  end() {
    this.instance.terminate()
    this.instance = null
  }
}
