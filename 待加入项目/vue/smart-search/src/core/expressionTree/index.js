import Token from './Token.js'
import Expression from './Expression.js'
export default class ExpressionTree {
  constructor() {
    this.Token = new Token()
    this.Expression = new Expression()
  }
  getExpressionTree(text) {
    let tokenList = this.Token.getTokenList(text)
    let expression = this.Expression.getExpression(tokenList)
    return expression
  }
}
