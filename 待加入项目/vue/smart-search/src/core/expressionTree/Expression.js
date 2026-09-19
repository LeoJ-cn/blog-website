import { forEach, last } from 'lodash'
import {
  TOKEN_TYPE_FIELD,
  TOKEN_TYPE_OPERATOR,
  EXPRESSION_TYPE_FIELD,
  EXPRESSION_TYPE_OPERATOR,
  EXPRESSION_TYPE_RANGE,
  EXPRESSION_TYPE_ROOT,
  EXPRESSION_TYPE_TOKEN,
  TOKEN_TYPE_USER,
  TOKEN_TYPE_SPACE,
  TOKEN_TYPE_LOGIC,
} from '../../constants'
import Validation from './Validation'

export default class Expression {
  constructor() {
    this.RootExpId = '0000000'
    this.LastId = '000000'
    this.TokenList = []
    this.ExpressionList = []
    this.ExpressionTree = {}
  }
  getExpression(TokenList) {
    this.ExpressionList = []
    this.ExpressionTree = {}
    this.TokenList = TokenList
    if (this.TokenList.length === 0) return
    this.createExpression(EXPRESSION_TYPE_ROOT)
    this.initExpressionTree()
    if (localStorage.getItem('debugger')) {
      console.log('===ExpressionTree===')
      console.log(this.ExpressionTree)
    }
    return this.ExpressionTree
  }
  initExpressionTree() {
    forEach(this.TokenList, (item, index) => {
      // 开启新的表达式
      if (item.type === TOKEN_TYPE_FIELD) {
        this.createExpression(EXPRESSION_TYPE_FIELD)
      } else if (item.type === TOKEN_TYPE_OPERATOR) {
        if (item.value === '(') {
          this.createExpression(EXPRESSION_TYPE_OPERATOR)
        } else if (item.value === '[') {
          this.createExpression(EXPRESSION_TYPE_RANGE)
        }
      }
      //   let currentExpression = last(this.ExpressionList);
      //   if (currentExpression.expressionType === EXPRESSION_TYPE_FIELD &&
      //     (currentExpression.children.length === 3 || item.value === ')' || item.value === ']')) {
      //     this.endExpression();
      //   }
      this.putItemIntoExpression({ item })
      // 结束表达式
      if (item.type === TOKEN_TYPE_OPERATOR) {
        if (item.value === ')') {
          this.endExpression()
        } else if (item.value === ']') {
          this.endExpression()
        }
      } else {
        let currentExpression = last(this.ExpressionList)
        let nextToken = this.TokenList[index + 1]
        if (
          currentExpression.expressionType === EXPRESSION_TYPE_FIELD &&
          currentExpression.children.length >= 3 &&
          nextToken &&
          (nextToken.type === TOKEN_TYPE_SPACE ||
            nextToken.type === TOKEN_TYPE_LOGIC ||
            nextToken.type === TOKEN_TYPE_OPERATOR)
        ) {
          this.endExpression()
        }
      }
    })
    if (this.ExpressionList.length > 0) {
      this.endAllExpression()
    }
  }
  createExpression(expressionType) {
    var newId = ('000000' + ++this.LastId).slice(-7)
    var id = this.RootExpId
    if (this.ExpressionList.length > 0) {
      id = `${id}_${newId}`
    }
    var obj = {
      id,
      expressionType,
      children: [],
      offset: {},
      value: '',
    }
    this.ExpressionList.push(obj)
  }
  putItemIntoExpression({ item }) {
    let currentExpression = last(this.ExpressionList)
    currentExpression.children.push({
      expressionType: EXPRESSION_TYPE_TOKEN,
      data: item,
    })
  }
  endExpression() {
    if (this.ExpressionList.length === 1) return
    let currentExpression = last(this.ExpressionList)
    let { offset, value } = _getExpressionOffset(currentExpression)
    currentExpression.value = value
    currentExpression.offset = offset
    this.ExpressionList.pop()
    currentExpression = Validation.getExpressionError(currentExpression, this.ExpressionList)
    last(this.ExpressionList).children.push(currentExpression)

    currentExpression = last(this.ExpressionList)
    if (
      currentExpression.expressionType === EXPRESSION_TYPE_FIELD &&
      currentExpression.children.length >= 3
    ) {
      this.endExpression()
    }
  }
  endAllExpression() {
    if (this.ExpressionList.length > 1) {
      this.endExpression()
      this.endAllExpression()
    } else if (this.ExpressionList.length === 1) {
      this.ExpressionTree = this.ExpressionList[0]
      let { offset, value } = _getExpressionOffset(this.ExpressionTree)
      this.ExpressionTree.offset = offset
      this.ExpressionTree.value = value
      this.ExpressionTree = Validation.getExpressionError(this.ExpressionTree)
    }
  }
}

function _getExpressionOffset(currentExpression) {
  let value = ''
  let start = ''
  let end = ''
  if (currentExpression.children[0].expressionType === EXPRESSION_TYPE_TOKEN) {
    start = currentExpression.children[0].data.start
  } else {
    start = currentExpression.children[0].offset.start
  }
  if (last(currentExpression.children).expressionType === EXPRESSION_TYPE_TOKEN) {
    end = last(currentExpression.children).data.end
  } else {
    end = last(currentExpression.children).offset.end
  }
  forEach(currentExpression.children, (item) => {
    if (item.expressionType === EXPRESSION_TYPE_TOKEN) {
      value += item.data.value
    } else {
      value += item.value
    }
  })
  return {
    offset: { start, end },
    value,
  }
}
