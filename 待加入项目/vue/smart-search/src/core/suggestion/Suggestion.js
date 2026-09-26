import $ from 'jquery'
import {
  forEach,
  includes,
  findIndex,
  filter,
  startsWith,
  get,
  assignIn,
  map,
  cloneDeep,
  find,
  isEmpty,
} from 'lodash'
import {
  REQUEST_TYPE_HISTORY,
  REQUEST_TYPE_FIELD_LIST,
  REQUEST_TYPE_LOGIC,
  REQUEST_TYPE_ASSIGNEE,
  REQUEST_TYPE_KEYWORDS,
  REQUEST_TYPE_AUTOCOMPLETE,
  REQUEST_TYPE_DATE,
  REQUEST_TYPE_RANGE,
  REQUEST_TYPE_RANGE_SHORT,
  REQUEST_TYPE_GNAME,
  TOKEN_TYPE_LOGIC,
  TOKEN_TYPE_OPERATOR,
  TOKEN_TYPE_PLACESYMBOL,
  TOKEN_TYPE_SPACE,
  TOKEN_TYPE_USER,
  EXPRESSION_TYPE_FIELD,
  EXPRESSION_TYPE_RANGE,
  EXPRESSION_TYPE_TOKEN,
  SECTION_TYPE_ANCS,
  SECTION_TYPE_FIELD,
  SECTION_TYPE_HISTORY,
  SECTION_TYPE_KEYWORDS,
  SUPPORT_ANCS_FIELDS,
  SECTION_TYPE_LOGIC,
  SECTION_TYPE_SAMPLE,
  EXPRESSION_TYPE_OPERATOR,
  SECTION_TYPE_AUTOCOMPLETE,
  OPERATOR_RANGE_LEFT,
} from '../../constants'
import {
  SUPPORT_KEYWORDS_FIELDS,
  SUPPORT_GNAME_FIELDS,
  DEFAULT_SYNTAX_VALUES,
  DATE_TYPE_FIELDS,
  RANGE_TYPE_FIELDS,
  RANGE_TYPE_FIELDS_SHORT,
  RANGE_SAMPLE,
  RANGE_SAMPLE_SHORT,
  DATE_SAMPLE,
  SYNTAX_VALUES,
} from '../config'
import { getDefaultSuggestions, findFieldSuggestionsByStem, getLogicSuggestions } from '../utils'

export default class Suggestion {
  constructor(options) {
    const defaultOption = {
      debugger: true,
      suggestionTypeList: [
        REQUEST_TYPE_AUTOCOMPLETE,
        REQUEST_TYPE_ASSIGNEE,
        REQUEST_TYPE_FIELD_LIST,
        REQUEST_TYPE_HISTORY,
        REQUEST_TYPE_KEYWORDS,
        REQUEST_TYPE_LOGIC,
        REQUEST_TYPE_DATE,
        REQUEST_TYPE_RANGE,
        REQUEST_TYPE_RANGE_SHORT,
        REQUEST_TYPE_GNAME,
      ],
    }
    this.options = assignIn(defaultOption, options)
    this.cursorRange = {}
    this.expressionTree = {}
    /** cursorWordData包含对象
     *  cursorToken: 当前光标所在token,
     *  cursorExp: 当前光标所在表达式,
     *  cursorFieldExp: 当前光标所在字段表达式,
     *  stemStartToken: stem为词组时，开始的token
     **/
    this.cursorWordData = {}
    this.$el = ''
  }
  initSuggestion(expressionTree, range, elem) {
    this.$el = $(elem)
    this.expressionTree = expressionTree
    this.cursorRange = range || {}
  }
  // 获取替换推荐词之后的 queryText
  getQueryTextWidthSuggeston(dropData) {
    let text = dropData.data.value
    const { section } = dropData
    if (
      section !== SECTION_TYPE_FIELD &&
      section !== SECTION_TYPE_LOGIC &&
      section !== SECTION_TYPE_HISTORY
    ) {
      text = `\"${text}\"`
      if (section === SECTION_TYPE_KEYWORDS) {
        text = `OR ${text}`
      }
      if (
        section === SECTION_TYPE_ANCS &&
        get(this.cursorWordData, 'cursorFieldExp.expressionType') !== EXPRESSION_TYPE_FIELD
      ) {
        text = `ANCS:(${text})`
      }
      // 表达式中包含左括号则自动补全右括号
      if (get(this.cursorWordData, 'cursorExp.expressionType') === EXPRESSION_TYPE_OPERATOR) {
        let children = get(this.cursorWordData, 'cursorExp.children')
        if (
          get(children, '[0].data.value') === '(' &&
          get(children, `[${children.length - 1}].data.value`) !== ')'
        ) {
          text += ')'
        }
      }
    }
    let tokenData = get(this.cursorWordData, 'cursorToken.data', {})
    const stemStartToken = get(this.cursorWordData, 'stemStartToken.data', {})
    let start = tokenData.start || 0
    if (
      (section === SECTION_TYPE_AUTOCOMPLETE || section === SECTION_TYPE_ANCS) &&
      stemStartToken.start
    ) {
      start = stemStartToken.start
    }
    let rangeStart = start + text.length
    let isRangeLast = true
    // 如果光标不是在最后则不做处理
    if (tokenData.end > this.cursorRange.end) {
      isRangeLast = false
    }
    if (tokenData.type === TOKEN_TYPE_SPACE || tokenData.type === TOKEN_TYPE_OPERATOR) {
      text = tokenData.value + text
      rangeStart = start + text.length
      if (section === SECTION_TYPE_FIELD) {
        rangeStart--
      }
    } else {
      if (section === SECTION_TYPE_FIELD) {
        let rangePos = text.indexOf(' TO ')
        if (rangePos > 0) {
          rangeStart = start + rangePos
        } else {
          rangeStart--
        }
      }
    }
    let queryText = this.getQueryText(text, section)
    if (section === SECTION_TYPE_HISTORY) {
      queryText = dropData.data.value
      rangeStart = queryText.length
      isRangeLast = true
    }
    let range = {
      start: rangeStart,
      end: rangeStart,
    }
    return {
      queryText,
      range,
      isRangeLast,
    }
  }
  /**
   * 根据光标位置获取推荐词
   * 该方法的返回会通过事件: EVENT_UPDATE_QUERY_DATA 传递到组件外部，
   * 再混合服务端返回的推荐项（根据 requestTypeList 获取) 通过 props: suggestionList 传入
   * 组件.
   *
   * 主要逻辑整理
   * 1. 如果存在cursorFieldExp说明当前光标在字段表达式中则推荐 KEYWORDS, ANCS, logic, history{
   * }
   * 2. 根据cursorExp的中前面token进行推荐
   * a. 如果前一个token为 logic 则推荐field, history, ANCS
   * b. 如果前一个token为user 则推荐logic, history, ANCS
   * c. 如果前面没有token 则推荐 field, history, ANCS
   * 3. 如果cursorToken不为空格，需要添加推荐 keyWords
   *
   * @param {obj} range 光标位置
   * @returns
   */
  getSuggestionByCursor(range) {
    this.cursorRange = range || {}
    this.cursorWordData = {}
    let suggestion = [] // 内部 suggestion 数据
    let stem = ''
    let requestTypeList = []
    // 如果输入为空(或空字符)
    if (!get(this.expressionTree, 'value', '').trim()) {
      suggestion = [getDefaultSuggestions()]
      return {
        stem,
        suggestion,
        requestTypeList,
      }
    }

    this.prepareCursorWordData(this.expressionTree, range)

    if (!this.cursorWordData.cursorToken) {
      return
    }

    const data = this.getSuggestionFnDataByCursor()
    const { requestTypes, cursorFieldData } = data
    stem = data.stem

    // FIXME: 如果 stem 存在且需要 field 类型的 suggestions
    if (includes(requestTypes, REQUEST_TYPE_FIELD_LIST)) {
      let qStem = (stem && stem.trim().toUpperCase()) || ''
      let suggestions = findFieldSuggestionsByStem(qStem)
      if (suggestions) {
        suggestion.push(suggestions)
      }
    }
    // FIXME: 如果 stem 存在且需要 logic 类型的 suggestions
    if (includes(requestTypes, REQUEST_TYPE_LOGIC)) {
      const suggestions = getLogicSuggestions()
      if (suggestions) {
        suggestion.push(suggestions)
      }
    }
    // SYNTAX_VALUES 默认值
    if (cursorFieldData) {
      if (DEFAULT_SYNTAX_VALUES[cursorFieldData.fieldName]) {
        cursorFieldData.default = DEFAULT_SYNTAX_VALUES[cursorFieldData.fieldName]
      }
      const suggestions = this.getSyntaxSuggestionsBySyntax(stem, cursorFieldData)
      if (suggestions) {
        suggestion.push(suggestions)
      }
    }
    let fieldName = get(
      this.cursorWordData,
      'cursorFieldExp.children[0].data.value',
      '',
    ).toLocaleUpperCase()
    // range类型提示sample suggestion.REQUEST_TYPE_RANGE_SHORT是REQUEST_TYPE_RANGE的子类。优先判断，另外子类和父类只能取其一
    if (includes(requestTypes, REQUEST_TYPE_RANGE)) {
      let content
      if (includes(requestTypes, REQUEST_TYPE_RANGE_SHORT)) {
        content = map(RANGE_SAMPLE_SHORT, (item) => {
          let itemTemp = cloneDeep(item)
          itemTemp.name = `${fieldName}:${itemTemp.name}`
          return itemTemp
        })
      } else {
        content = map(RANGE_SAMPLE, (item) => {
          let itemTemp = cloneDeep(item)
          itemTemp.name = `${fieldName}:${itemTemp.name}`
          return itemTemp
        })
      }
      let suggestions = {
        section: SECTION_TYPE_SAMPLE,
        content,
      }
      if (suggestions) {
        suggestion.push(suggestions)
      }
    }
    // data类型提示sample suggestion
    if (includes(requestTypes, REQUEST_TYPE_DATE)) {
      let content = map(DATE_SAMPLE, (item) => {
        let itemTemp = cloneDeep(item)
        itemTemp.name = `${fieldName}:${itemTemp.name}`
        return itemTemp
      })
      let suggestions = {
        section: SECTION_TYPE_SAMPLE,
        content,
      }
      if (suggestions) {
        suggestion.push(suggestions)
      }
    }

    /**
     * 排除 REQUEST_TYPE_FIELD_LIST 和 REQUEST_TYPE_LOGIC 这两个类型的推荐项，这些都在前端硬编码了
     */
    requestTypeList = filter(requestTypes, (item) => {
      return !(item === REQUEST_TYPE_FIELD_LIST || item === REQUEST_TYPE_LOGIC)
    })

    return {
      suggestion,
      stem,
      requestTypeList,
    }
  }
  prepareCursorWordData(expressionTree, pos) {
    let isTokenActive = false
    if (expressionTree && expressionTree.children && pos) {
      forEach(expressionTree.children, (item) => {
        if (item.expressionType === EXPRESSION_TYPE_TOKEN) {
          if (item.data.start < pos.start && item.data.end >= pos.end) {
            this.cursorWordData.cursorToken = item
            isTokenActive = true
          }
        } else {
          if (item.offset.start < pos.start && item.offset.end >= pos.end) {
            this.prepareCursorWordData(item, pos)
          }
        }
      })
    }
    if (isTokenActive) {
      this.cursorWordData.cursorExp = expressionTree
    }
    if (
      this.cursorWordData.cursorExp &&
      !this.cursorWordData.cursorFieldExp &&
      expressionTree.expressionType === EXPRESSION_TYPE_FIELD
    ) {
      this.cursorWordData.cursorFieldExp = expressionTree
    }
  }
  getSuggestionFnDataByCursor() {
    let { cursorToken, cursorExp, cursorFieldExp } = this.cursorWordData
    let suggestionFnData = {
      typeList: [],
    }
    let currentIndex = findIndex(cursorExp.children, cursorToken)
    let prevExpType = get(cursorExp.children[currentIndex - 1], 'expressionType')
    let curExpType = get(cursorExp, 'expressionType')
    let prevType = get(cursorExp.children[currentIndex - 1], 'data.type')
    let curType = get(cursorToken, 'data.type')
    let nextType = get(cursorExp.children[currentIndex + 1], 'data.type')
    let stem = ''
    if (curType === TOKEN_TYPE_USER || curType === TOKEN_TYPE_SPACE) {
      stem = this.getStem()
    }
    suggestionFnData.stem = stem

    if (cursorFieldExp) {
      let fieldName = get(cursorFieldExp, 'children[0].data.value').toLocaleUpperCase()
      if (includes(DATE_TYPE_FIELDS, fieldName) && cursorToken.data.value === OPERATOR_RANGE_LEFT) {
        suggestionFnData.typeList.push(REQUEST_TYPE_DATE)
      }
      if (
        includes(RANGE_TYPE_FIELDS, fieldName) &&
        cursorToken.data.value === OPERATOR_RANGE_LEFT
      ) {
        suggestionFnData.typeList.push(REQUEST_TYPE_RANGE)
      }
      if (
        includes(RANGE_TYPE_FIELDS_SHORT, fieldName) &&
        cursorToken.data.value === OPERATOR_RANGE_LEFT
      ) {
        suggestionFnData.typeList.push(REQUEST_TYPE_RANGE_SHORT)
      }
      if (stem && stem.trim()) {
        if (includes(SUPPORT_ANCS_FIELDS, fieldName) && curType !== TOKEN_TYPE_SPACE) {
          suggestionFnData.typeList.push(REQUEST_TYPE_ASSIGNEE)
        }
        if (includes(SUPPORT_KEYWORDS_FIELDS, fieldName)) {
          if (/\s$/.test(stem)) {
            suggestionFnData.typeList.push(REQUEST_TYPE_KEYWORDS)
          } else {
            suggestionFnData.typeList.push(REQUEST_TYPE_AUTOCOMPLETE)
          }
        }
        if (includes(SUPPORT_GNAME_FIELDS, fieldName) && curType !== TOKEN_TYPE_SPACE) {
          suggestionFnData.typeList.push(REQUEST_TYPE_GNAME)
        }
      }
      if (
        cursorExp.expressionType === EXPRESSION_TYPE_OPERATOR &&
        cursorExp.offset.start < this.cursorRange.start &&
        this.cursorRange.end < cursorExp.offset.end &&
        !/["']$/.test(cursorToken.data.value)
      ) {
        suggestionFnData.cursorFieldData = {
          fieldName: fieldName,
        }
      }
    } else {
      if (cursorToken.data.type === TOKEN_TYPE_USER || cursorToken.data.type === TOKEN_TYPE_SPACE) {
        if (stem && stem.trim()) {
          if (curType !== TOKEN_TYPE_SPACE) {
            suggestionFnData.typeList.push(REQUEST_TYPE_ASSIGNEE)
            suggestionFnData.typeList.push(REQUEST_TYPE_FIELD_LIST)
          }
          if (/\s$/.test(stem)) {
            suggestionFnData.typeList.push(REQUEST_TYPE_KEYWORDS)
          } else {
            suggestionFnData.typeList.push(REQUEST_TYPE_AUTOCOMPLETE)
          }
        } else if (prevType === TOKEN_TYPE_LOGIC) {
          suggestionFnData.typeList.push(REQUEST_TYPE_FIELD_LIST)
        }
      }
    }
    if (
      currentIndex > 0 &&
      curExpType !== EXPRESSION_TYPE_RANGE &&
      cursorExp.children.length > 1 &&
      curType === TOKEN_TYPE_SPACE &&
      (prevExpType !== EXPRESSION_TYPE_TOKEN ||
        prevType === TOKEN_TYPE_USER ||
        prevType === TOKEN_TYPE_PLACESYMBOL) &&
      nextType !== TOKEN_TYPE_LOGIC
    ) {
      suggestionFnData.typeList.push(REQUEST_TYPE_LOGIC)
      if (!includes(suggestionFnData.typeList, REQUEST_TYPE_KEYWORDS)) {
        suggestionFnData.typeList = [REQUEST_TYPE_LOGIC]
        suggestionFnData.cursorFieldData = {}
      }
    }
    //  截词以引号结尾不提示推荐词
    if (/["']$/.test(cursorToken.data.value)) {
      suggestionFnData.typeList = []
      return suggestionFnData
    }
    suggestionFnData.typeList = filter(suggestionFnData.typeList, (item) => {
      return includes(this.options.suggestionTypeList, item)
    })
    suggestionFnData.requestTypes = suggestionFnData.typeList
    return suggestionFnData
  }
  previewSuggestion(data) {
    let tokenData = get(this.cursorWordData, 'cursorToken.data')
    if (!this.$el) return
    if (tokenData && get(data, 'data.value') && data.section !== SECTION_TYPE_HISTORY) {
      let start = 0
      let tStr = tokenData.value.trim()
      let dStr = data.data.value
      if (tokenData.type === TOKEN_TYPE_USER) {
        start = tStr.length
      }
      if (start > 0 && !startsWith(dStr.toLocaleUpperCase(), tStr.toLocaleUpperCase())) {
        start = -1
      }
      if (start > -1) {
        let previewText = dStr.substring(start)
        this.$el
          .find('.ed_tk_' + this.cursorWordData.cursorToken.data.id)
          .addClass('ed_tk_preview')
          .attr('preview-text', previewText)
      } else {
        this.$el.find('.ed_tk_preview').removeAttr('preview-text').removeClass('ed_tk_preview')
      }
    } else {
      this.$el.find('.ed_tk_preview').removeAttr('preview-text').removeClass('ed_tk_preview')
    }
  }
  getQueryText(text, section) {
    const { cursorWordData, expressionTree } = this
    let queryText = text
    const cursorToken = get(cursorWordData, 'cursorToken.data')
    const stemStartToken = get(cursorWordData, 'stemStartToken.data')
    if (cursorToken && expressionTree) {
      let { start, end } = cursorToken
      if (stemStartToken && section !== SECTION_TYPE_LOGIC && section !== SECTION_TYPE_KEYWORDS) {
        start = stemStartToken.start
      }
      queryText = expressionTree.value
      let endText = queryText.substring(end)
      endText = /^[\s\]\)]/.test(endText) ? endText : ` ${endText}`
      queryText = `${queryText.substring(0, start)}${text}${endText}`
    }
    return queryText
  }
  getStem() {
    let { cursorToken, cursorExp } = this.cursorWordData
    let stem = ''
    let data = cursorToken.data
    stem = data.value.substring(0, this.cursorRange.end - data.start)
    for (let i = cursorExp.children.length; i > 0; i--) {
      let item = cursorExp.children[i - 1]
      let end = item.expressionType === EXPRESSION_TYPE_TOKEN ? item.data.end : item.offset.end
      if (end <= cursorToken.data.start) {
        if (
          item.expressionType === EXPRESSION_TYPE_TOKEN &&
          (item.data.type === TOKEN_TYPE_USER || item.data.type === TOKEN_TYPE_SPACE)
        ) {
          stem = item.data.value + stem
          if (item.data.type === TOKEN_TYPE_USER) {
            this.cursorWordData.stemStartToken = item
          }
        } else {
          break
        }
      }
    }
    stem = stem.replace(/^\s+/, '')
    return stem
  }
  getSyntaxSuggestionsBySyntax(stem, cursorFieldData) {
    let syntax = cursorFieldData.fieldName
    let defaultSyntax = cursorFieldData.default
    if (!syntax) return
    let content = get(SYNTAX_VALUES, syntax, [])
    if (stem) {
      content = filter(content, ({ value }) => {
        return startsWith(value.toLocaleUpperCase(), stem.toLocaleUpperCase())
      })
    } else {
      if (defaultSyntax) {
        let defaultContent = []
        forEach(defaultSyntax, (item) => {
          let itemContent = find(content, (subItem) => {
            return subItem.value === item
          })
          defaultContent.push(itemContent)
        })
        content = defaultContent
      }
    }
    if (content.length === 0) return
    return {
      section: syntax,
      content,
    }
  }
  getCursorWordData(range) {
    if (isEmpty(this.cursorWordData)) {
      this.prepareCursorWordData(this.expressionTree, range)
    }
    return this.cursorWordData
  }
}
