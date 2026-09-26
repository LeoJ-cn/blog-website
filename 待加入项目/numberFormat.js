// 金额以及其他数字格式化
const splitRegExp = (spLength) => new RegExp(`(\\d{${spLength}})(?=(\\d)+)`, 'img')
const numReverse = (num) =>
  String(num || '')
    .split('')
    .reverse()
    .join('')

// TODO: 验证数字有效范围
export const commonNumberFormat = (config = {}) => {
  const {
    toFixedLength = 2, // 精确小数位
    splitLength = 0, // 数字分隔符长度， 举例 splitLength=3 ： 67,888,888.89
    splitChar = ',', // 分隔符字符
  } = config
  return (number) => {
    const num = Number(number)
    const isUnValid = String(num) === 'NaN' || String(num) === '0'
    if (isUnValid) return '0'
    const fixedNum = num.toFixed(toFixedLength)
    const numConfig = String(fixedNum).split('.') // 小数点左右数字

    const rightNumString = numConfig && numConfig[1] ? `.${numConfig[1]}` : '' // 小数点右侧侧数字字符

    let leftNumString = numConfig[0] // 小数点左侧数字字符
    if (splitLength) {
      leftNumString = numReverse(leftNumString)
      leftNumString = leftNumString.replace(splitRegExp(splitLength), `$1${splitChar}`)
      leftNumString = numReverse(leftNumString)
    }

    return leftNumString + rightNumString
  }
}
