import { forEach, find } from 'lodash'
import $ from 'jquery'
import { EXPRESSION_TYPE_TOKEN } from '../../constants'

/**
 * 将expressionTree 转换为html 字符串
 * @param {*} expressionTree
 */
function getHtmlStrByExpressionTree(expressionTree) {
  let htmlStr = _getHtmlStr(expressionTree)
  return htmlStr
}
/**
 * 将expressionTree 转换为query 字符串
 * @param {*} expressionTree
 */
function getStrByExpressionTree(expressionTree) {
  let htmlStr = _getHtmlStr(expressionTree)
  let str = $(htmlStr).text()
  return str
}

export { getHtmlStrByExpressionTree, getStrByExpressionTree }

/**
 * @param {obj} expressionTree 结构化语法树
 * 主要作用是递归语法树将其转换为一个html字符串
 */
function _getHtmlStr(expressionTree) {
  let htmlStr = ''
  let htmlStrArr = []
  if (expressionTree && expressionTree.children) {
    let errorData = expressionTree.errorData
    forEach(expressionTree.children, (item) => {
      if (item.expressionType === EXPRESSION_TYPE_TOKEN) {
        let classNameArr = []
        classNameArr.push(item.data.type)
        classNameArr.push('ed_tk_' + item.data.id)
        let errorCode = ''
        if (errorData && errorData.tokenError) {
          let error = find(errorData.tokenError, {
            id: item.data.id,
          })
          if (error) {
            classNameArr.push('error')
            errorCode = error.errorCode
          }
        }
        htmlStr = `<span class="ed_tk ${classNameArr.join(' ')}" data-error-code="${errorCode}">${item.data.value}</span>`
      } else {
        htmlStr = _getHtmlStr(item)
      }
      htmlStrArr.push(htmlStr)
    })
    let errorCodeArr = []
    let expClassNameArr = []
    if (errorData && errorData.expressionError && errorData.expressionError.length > 0) {
      expClassNameArr.push('error')
      forEach(errorData.expressionError, (item) => {
        errorCodeArr.push(item.errorCode)
      })
    }
    htmlStr = `<span class="ed_ep ${expClassNameArr.join(' ')}" data-error-code="${errorCodeArr.join(',')}">${htmlStrArr.join('')}</span>`
  }
  return htmlStr
}
