// 将字符串转换为TokenList
import { isString, map, includes } from 'lodash'
import {
  LOGIC_OPERATOR_AND,
  LOGIC_OPERATOR_OR,
  LOGIC_OPERATOR_NOT,
  OPERATORS,
  TOKEN_TYPE_FIELD,
  TOKEN_TYPE_LOGIC,
  TOKEN_TYPE_OPERATOR,
  TOKEN_TYPE_PLACESYMBOL,
  TOKEN_TYPE_SPACE,
  TOKEN_TYPE_USER,
} from '../../constants'

const REG_TOKEN = /[\(\)\[\]\:]|\s+|(\'[^']*\'?)|(\"[^"]*\"?)|[^\s\(\)\[\]\:\'\"]+/g

const LOGIC_OPERATORS = [LOGIC_OPERATOR_AND, LOGIC_OPERATOR_OR, LOGIC_OPERATOR_NOT]

const repairText = (text) => {
  return text
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/：/g, ':')
    .replace(/[\t\r\n]/g, ' ')
}

const splitWords = (text) => {
  return text.match(REG_TOKEN)
}

export default class Token {
  constructor() {
    this.token = []
    this.TokenList = []
  }

  getTokenList(text) {
    if (!isString(text)) return []
    this.text = text
    this.originText = repairText(text)
    this.token = splitWords(this.originText)
    this.TokenList = this.formatTokenList(this.token)
    if (localStorage.getItem('debugger')) {
      console.log('==splitWords==\n', this.token)
      console.log('==TokenList==\n', this.TokenList)
    }
    return this.TokenList
  }

  formatTokenList(token) {
    let startPos = 0
    return map(token, (item, index) => {
      const data = this.getTokenData({ token: item, index, startPos })
      startPos += item.length
      return data
    })
  }

  getTokenData({ token, index, startPos }) {
    let data = {
      id: `000${index}`,
      value: token,
      start: startPos,
      end: startPos + token.length,
      type: TOKEN_TYPE_USER,
    }
    data.type = this.getTokenType({ token, index })
    return data
  }

  getTokenType({ token, index }) {
    let type = TOKEN_TYPE_USER
    if (includes(LOGIC_OPERATORS, token.toLocaleUpperCase())) {
      type = TOKEN_TYPE_LOGIC
    } else if (includes(OPERATORS, token)) {
      type = TOKEN_TYPE_OPERATOR
    } else if (/^\s+$/.test(token)) {
      type = TOKEN_TYPE_SPACE
    } else if (/^\$(W|PRE)/.test(token.toUpperCase())) {
      type = TOKEN_TYPE_PLACESYMBOL
    } else {
      if (
        this.token[index + 1] === ':' ||
        (/\s+/.test(this.token[index + 1]) && this.token[index + 2] === ':')
      ) {
        type = TOKEN_TYPE_FIELD
      }
    }
    return type
  }
}
