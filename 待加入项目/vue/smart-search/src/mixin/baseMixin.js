import { includes, get } from 'lodash'
import { EVENT_UPDATE_EDITOR_STATUS } from '../constants'
import {
  DOM_EVENT_KEYDOWN,
  DOM_EVENT_UP,
  DOM_EVENT_FOCUS,
  DOM_EVENT_BLUR,
  DOM_VK_TAB,
  DOM_VK_RETURN,
  DOM_VK_LEFT,
  DOM_VK_UP,
  DOM_VK_RIGHT,
  DOM_VK_DOWN,
  DELAY_UPDATE_EDITOR_STATUS,
  TYPE_SELECT_OPTION_RIGHT,
  CLASS_NAME_EDITOR_CONTAINER,
  SECTION_TYPE_SAMPLE,
} from '../constants'

export default {
  data() {
    return {
      baseMixin__timerUpdateEditorStatus: null,
      baseMixin__editorStatus: '',
    }
  },
  methods: {
    baseMixin__bindKeywordDownEvents() {
      this.$editor
        .off(DOM_EVENT_KEYDOWN)
        .on(DOM_EVENT_KEYDOWN, (e) => {
          if (!includes(e.target.className, CLASS_NAME_EDITOR_CONTAINER)) {
            return
          }

          const { keyCode } = e

          if (
            (keyCode === DOM_VK_TAB || keyCode === DOM_VK_RETURN) &&
            this.dropData &&
            this.dropData.data
          ) {
            this.putSelectedOptionIntoEditor(TYPE_SELECT_OPTION_RIGHT, e)
            e.preventDefault()
            return
          }

          if (
            this.dropData &&
            this.suggestionList.length > 0 &&
            (keyCode === DOM_VK_UP || keyCode === DOM_VK_DOWN)
          ) {
            e.preventDefault()
            this.baseMixin__updatePreSelectedOption(keyCode)
          }

          if (keyCode === DOM_VK_RETURN) {
            this.config.submitCallBack && this.config.submitCallBack()
            this.$node.blur()
            e.preventDefault()
          }
        })
        .off(DOM_EVENT_UP)
        .on(DOM_EVENT_UP, (e) => {
          const { keyCode } = e
          if (keyCode === DOM_VK_RIGHT || keyCode === DOM_VK_LEFT) {
            this.getSuggestion()
          }
        })
        .off(DOM_EVENT_FOCUS)
        .on(DOM_EVENT_FOCUS, () => {
          this.baseMixin__updateEditorStatus(DOM_EVENT_FOCUS)
        })
        .off(DOM_EVENT_BLUR)
        .on(DOM_EVENT_BLUR, () => {
          this.baseMixin__updateEditorStatus(DOM_EVENT_BLUR)
        })
    },
    baseMixin__updateEditorStatus(status) {
      // Passing an invalid ID to clearTimeout() silently does nothing; no exception is thrown.
      if (this.baseMixin__timerUpdateEditorStatus) {
        clearTimeout(this.baseMixin__timerUpdateEditorStatus)
        this.baseMixin__timerUpdateEditorStatus = null
        this.baseMixin__editorStatus = status
        this.$emit(EVENT_UPDATE_EDITOR_STATUS, { status })
        return
      }
      this.baseMixin__timerUpdateEditorStatus = setTimeout(() => {
        this.baseMixin__editorStatus = status
        this.baseMixin__timerUpdateEditorStatus = null
        /**
         * 组件外部接受到该事件时，如果 status = 'blur'，则会清空 suggestionList
         */
        this.$emit(EVENT_UPDATE_EDITOR_STATUS, { status })
        /**
         * status = 'blur' 会清空 suggestionList, 所以 只在 status = 'focus’ 情况下
         */
        if (status === DOM_EVENT_FOCUS && !this.inputModeMixin__query.trim()) {
          this.getSuggestion()
        }
        if (status === DOM_EVENT_BLUR) {
          this.$node.scrollLeft = 0
          this.$node.scrollTop = 0
        } else if (status === DOM_EVENT_FOCUS) {
          let len = this.inputModeMixin__query.length
          this.fixFocus({
            start: len,
            end: len,
          })
          //   this.$node.scrollLeft = this.$el.scrollWidth;
          //   this.$node.scrollTop = this.$el.scrollHeight;
        }
      }, DELAY_UPDATE_EDITOR_STATUS)
    },
    baseMixin__updatePreSelectedOption(keyCode) {
      let section = get(this.suggestionList, '[0].section')
      if (section === SECTION_TYPE_SAMPLE) return
      if (keyCode === DOM_VK_UP) {
        if (this.dropData.selectIndex > 0) {
          this.dropData.selectIndex--
        }
      } else {
        this.dropData.selectIndex++
      }
    },
    baseMixin__updateSelectedIndex(index) {
      this.dropData.selectIndex = index
    },
  },
}
