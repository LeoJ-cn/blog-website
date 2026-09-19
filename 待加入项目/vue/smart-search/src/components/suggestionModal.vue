<template>
  <SuggestionBoard
    :default-status="isDefaultStatus"
    :suggestion="suggestionList"
    :selected-index="dropData.selectIndex"
    @update-selected-index="updateSelectedIndex"
    @select="({ index }) => selectOption(SELECT_OPTIONS_SELECTED, index)"
  >
  </SuggestionBoard>
</template>

<script>
import { get, forEach, cloneDeep } from 'lodash'
import { formatKeyWord } from '../utils'
import {
  SELECT_OPTIONS_PRE_SELECTED,
  SELECT_OPTIONS_SELECTED,
  DEFAULT_SORT,
  SECTION_TYPE_FIELD,
  SECTION_TYPE_SAMPLE,
} from '../constants'
import SuggestionBoard from 'packages/suggestion-board'
const MODAL_WIDTH = 380

export default {
  name: 'SuggestionModal',
  components: {
    SuggestionBoard,
  },
  props: {
    suggestion: {
      default() {
        return []
      },
    },
    dropData: {
      default() {
        return {
          currentChar: '',
          selectIndex: -1,
        }
      },
    },
    position: {
      type: Object,
    },
  },
  data() {
    return {
      modalPos: cloneDeep(this.position),
      currentSection: '',
    }
  },
  watch: {
    selectIndex(newVal) {
      let index = newVal
      if (index >= this.dropList.length) {
        index = this.dropList.length - 1
      }
      if (newVal === undefined) return
      this.previewOption(index)
    },
    suggestion() {
      this.previewOption()
    },
    position() {
      this.updateModalPos()
    },
  },
  computed: {
    suggestionList() {
      let index = 0
      let suggestionList = cloneDeep(this.suggestion).sort((a, b) => {
        return DEFAULT_SORT.indexOf(a.section) - DEFAULT_SORT.indexOf(b.section)
      })
      forEach(suggestionList, (item) => {
        forEach(item.content, (subItem) => {
          subItem.index = index
          index++
        })
      })
      return suggestionList
    },
    selectIndex() {
      return this.dropData.selectIndex
    },
    dropList() {
      let dropList = []
      forEach(this.suggestionList, (item) => {
        dropList = dropList.concat(item.content)
      })
      return dropList
    },
    lang() {
      return get(this, '$i18n.locale', 'en')
    },
    isDefaultStatus() {
      const { suggestionList } = this
      for (let i = 0, size = suggestionList.length; i < size; i++) {
        const { section, isDefault } = suggestionList[i]
        if (section === SECTION_TYPE_FIELD && isDefault) {
          return true
        }
      }
      return false
    },
  },
  created() {
    this.formatKeyWord = formatKeyWord
    this.SELECT_OPTIONS_SELECTED = SELECT_OPTIONS_SELECTED
  },
  mounted() {
    this.$nextTick(() => {
      this.updateModalPos()
      this.previewOption()
    })
  },
  methods: {
    previewOption(index = -1) {
      this.selectOption(SELECT_OPTIONS_PRE_SELECTED, index)
    },
    selectOption(type, index) {
      this.updateCurrentSection(index)
      let data = cloneDeep(this.dropList[index])
      if (this.currentSection === SECTION_TYPE_SAMPLE) return
      let option = {
        type,
        section: this.currentSection,
        selectIndex: index,
        data,
      }
      if (type === SELECT_OPTIONS_PRE_SELECTED) {
        this.$emit('preview-option', option)
      } else {
        this.$emit('select-option', option)
      }
    },
    updateModalPos() {
      //   if (this.isDefaultStatus) return;
      let modalWidth = MODAL_WIDTH
      let editorWidth = this.$el.parentElement.offsetWidth
      let left = get(this.position, 'left')
      let offsetRight = get(this.position, 'offset.right', 0)
      left = left < 0 ? 0 : left
      let maxLeft = editorWidth + offsetRight - modalWidth
      left = Math.min(left, maxLeft)
      if (modalWidth >= editorWidth) {
        left = 0
      }
      if (left && left > 0) {
        this.$el.style.left = left + 'px'
      } else {
        this.$el.style.left = '0px'
      }
    },
    updateCurrentSection(index) {
      let start = 0
      let end = 0
      forEach(this.suggestionList, ({ section, content }) => {
        let { length } = content
        end = length + start
        if (index >= start && index < end) {
          this.currentSection = section
        }
        start += length
      })
    },
    updateSelectedIndex(index) {
      this.$emit('update-selected-index', index)
    },
  },
}
</script>
