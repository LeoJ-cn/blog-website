import $ from 'jquery'
import { getInputRange, setInputRange } from '../core/utils/inputRanges'
import { getHtmlStrByExpressionTree } from '../core/utils/smartSearchUtils'
import { debounce } from 'lodash'

export default {
  data() {
    return {
      inputModeMixin__query: '',
      inputModeMixin__errorModalData: {
        count: 0,
        htmlStr: '',
      },
    }
  },
  watch: {
    inputModeMixin__query() {
      this.inputModeMixin__query = this.inputModeMixin__query
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      this.updateQuery(this.inputModeMixin__query)
      if (!this.divMode) {
        this.inputModeMixin__updateQuery()
        this.isInputing = true
      }
    },
  },
  methods: {
    inputModeMixin__updateQuery: debounce(function () {
      this.isInputing = false
      console.warn('inputModeMixin__updateQuery')
      const range = this.inputModeMixin__getRange()
      this.setQuery(this.inputModeMixin__query, range)
    }, 250),
    inputModeMixin__updateDOM() {
      let htmlStr = getHtmlStrByExpressionTree(this.expressionTree)
      let str = $(htmlStr).text()
      let count = $(htmlStr).find('.error').length
      this.$node.value = str
      this.inputModeMixin__query = str
      this.inputModeMixin__errorModalData = {
        htmlStr,
        count,
      }
      this.$emit('update-error-count', count)
    },
    inputModeMixin__setRange(range) {
      setInputRange(this.$node, range)
    },
    inputModeMixin__getRange() {
      return getInputRange(this.$node)
    },
    inputMixn__scrollToFocus(range) {
      let start = range.start
      if (start > 0) {
        let pStr =
          this.inputModeMixin__query.substring(0, start) +
          '<span class="editor-container__textarea-target">0</span>' +
          this.inputModeMixin__query.substring(start)
        this.$el.querySelector('.editor-container__textarea-placeholder').innerHTML = pStr
        let focusDom = this.$el.querySelector('.editor-container__textarea-target')
        if (!focusDom) return
        let tdHeight = focusDom.offsetHeight
        let tdTop = focusDom.offsetTop
        let editorHeight = this.$el.offsetHeight
        let scrollTop = this.$node.scrollTop
        if (editorHeight + scrollTop < tdHeight + tdTop + 20) {
          this.$node.scrollTop = tdHeight + tdTop - editorHeight + 20
        }
        if (this.inputModeMixin__query.length - start < 50) {
          this.$node.scrollTop = this.$el.scrollHeight
        }
      }
    },
  },
}
