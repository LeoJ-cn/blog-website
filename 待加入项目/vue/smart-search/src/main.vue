<template>
  <div :class="{
        'ai-common-smart-search': true,
        'ai-common-smart-search--blur': baseMixin__editorStatus !== DOM_EVENT_FOCUS,
        'ai-common-smart-search--focus': baseMixin__editorStatus === DOM_EVENT_FOCUS
      }">
      <div
        v-if="config.editorType === EDITOR_TYPE_DIV_INPUT"
        :placeholder="config.placeHolder"
        contenteditable="true"
        spellcheck="false"
        :class="{
          'editor-container': true,
          'editor-container--show-error': errorVisible,
          'div-input': true,
        }">
      </div>
      <div
        v-if="config.editorType === EDITOR_TYPE_DIV_TEXTAREA"
        :placeholder="config.placeHolder"
        contenteditable="true"
        spellcheck="false"
        class="editor-container div-textarea"
        :class="{
            'editor-container--show-error': errorVisible
        }">
      </div>
      <input
        v-if="config.editorType === EDITOR_TYPE_INPUT"
        v-model="inputModeMixin__query"
        :placeholder="config.placeHolder"
        type="text" 
        spellcheck="false"
        class="editor-container input"/>
      <textarea
        v-if="config.editorType === EDITOR_TYPE_TEXTAREA"
        v-model="inputModeMixin__query"
        :placeholder="config.placeHolder"
        spellcheck="false"
        type="text"
        class="editor-container textarea"/>
        <div class="editor-container textarea editor-container__textarea-placeholder"></div>
      <suggestion-modal
        :class="{'full-width-modal':(config.editorType === EDITOR_TYPE_TEXTAREA||config.editorType === EDITOR_TYPE_INPUT)}"
        v-show="suggestionList.length > 0 && baseMixin__editorStatus === DOM_EVENT_FOCUS"
        :drop-data="dropData"
        :suggestion="suggestionList"
        :position="modalPos"
        @select-option="selectOptionHandler"
        @preview-option="previewOption"
        @update-selected-index="baseMixin__updateSelectedIndex"
        class="suggestion-modal">
      </suggestion-modal>
      <field-list
        v-if="fieldList.length > 0"
        :field-list="fieldList"
        :style="fieldListPos"
        @select-field="divModeMixin__clearFieldList">
      </field-list>
      <error-modal
        v-if="inputModeMixin__errorModalData.count > 0 && !divMode && errorVisible"
        :error-modal-data="inputModeMixin__errorModalData"
        :editor-status="baseMixin__editorStatus"
        :config="config">
      </error-modal>
      <error-tip
        v-if="divModeMixin__errorTipData && divModeMixin__errorTipData.errorCode"
        :error-data="divModeMixin__errorTipData">
      </error-tip>
  </div>
</template>

<script>
import $ from 'jquery';
import {
  EDITOR_TYPE_DIV_INPUT,
  EDITOR_TYPE_DIV_TEXTAREA,
  EDITOR_TYPE_INPUT,
  EDITOR_TYPE_TEXTAREA,
  DOM_EVENT_FOCUS,
  EVENT_UPDATE_SUGGESTION_DATA,
  EVENT_UPDATE_QUERY,
  REQUEST_TYPE_DATE,
  REQUEST_TYPE_RANGE,
  SELECTOR_EDITOR_CONTAINER,
  REQUEST_TYPE_HISTORY,
  REQUEST_TYPE_FIELD_LIST,
  REQUEST_TYPE_LOGIC,
  REQUEST_TYPE_ASSIGNEE,
  REQUEST_TYPE_KEYWORDS,
  REQUEST_TYPE_AUTOCOMPLETE,
  REQUEST_TYPE_GNAME
} from './constants';
import ExpressionTree from './core/expressionTree';
import Suggestion from './core/suggestion/Suggestion';
import suggestionModal from './components/suggestionModal';
import errorTip from './components/errorTip';
import errorModal from './components/errorModal';
import fieldList from './components/fieldList';
import baseMixin from './mixin/baseMixin';
import divModeMixin from './mixin/divMixin';
import inputMixin from './mixin/inputMixin';
import { isPatentNumber } from './utils';
import {debounce, includes} from 'lodash';

const defaultConfig = {
  editorType: EDITOR_TYPE_TEXTAREA,
  suggestionTypeList: [
    REQUEST_TYPE_AUTOCOMPLETE,
    REQUEST_TYPE_ASSIGNEE,
    REQUEST_TYPE_FIELD_LIST,
    REQUEST_TYPE_HISTORY,
    REQUEST_TYPE_KEYWORDS,
    REQUEST_TYPE_LOGIC,
    REQUEST_TYPE_DATE,
    REQUEST_TYPE_RANGE,
    REQUEST_TYPE_GNAME
  ],
  placeHolder: 'Search Query',
  offset: { left: 0, right: 0 },
  submitCallBack: null
};
// let lastCaretPosTop = null;

export default {
  name: 'AiCommonSmartSearch',
  mixins: [
    baseMixin,
    divModeMixin,
    inputMixin
  ],
  components: {
    suggestionModal,
    errorTip,
    fieldList,
    errorModal
  },
  props: {
    config: {
      default() {
        return defaultConfig;
      }
    },
    suggestionList: {
      default() {
        return [];
      }
    },
    queryData: {
      default() {
        return {};
      }
    },
    previewCount: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      modalPos: {},
      dropData: {},
      fieldList: [],
      fieldListPos: {},
      errorVisible: !this.previewCount,
      expressionTree: {},
      isInputing: false
    };
  },
  computed: {
    editorType() {
      return this.config.editorType;
    },
    divMode() {
      const editorType = this.config.editorType;
      return editorType === EDITOR_TYPE_DIV_INPUT || editorType === EDITOR_TYPE_DIV_TEXTAREA;
    }
  },
  watch: {
    editorType() {
      this.initSmartSearch();
    },
    previewCount: debounce(function(newVal) {
      this.errorVisible = !newVal;
      if (includes(this.inputModeMixin__query, 'patFILTER=')) {
        this.errorVisible = false;
      }
    }, 300)
  },
  created() {
    this.init();

    this.EDITOR_TYPE_DIV_INPUT = EDITOR_TYPE_DIV_INPUT;
    this.EDITOR_TYPE_DIV_TEXTAREA = EDITOR_TYPE_DIV_TEXTAREA;
    this.EDITOR_TYPE_INPUT = EDITOR_TYPE_INPUT;
    this.EDITOR_TYPE_TEXTAREA = EDITOR_TYPE_TEXTAREA;
    this.DOM_EVENT_FOCUS = DOM_EVENT_FOCUS;
    this.isPatentNumber = isPatentNumber;
    this.it_updateErrorVisiblity = null;
  },
  mounted() {
    this.initSmartSearch();
  },
  methods: {
    init() {
      this.$node = null;
      this.expressionTree = {};

      let option = {};
      if (this.config.suggestionTypeList) {
        option.suggestionTypeList = this.config.suggestionTypeList;
      }
      this.expressionTreeInstance = new ExpressionTree();
      this.suggestionInstance = new Suggestion(option);
    },
    initSmartSearch() {
      this.$node = this.$el.querySelector(SELECTOR_EDITOR_CONTAINER);
      this.$editor = $(this.$node);
      this.bindEvents();
      if (this.queryData.query) {
        // this.inputModeMixin__query = this.queryData.query;
        this.setQuery(this.queryData.query);
      }
    },
    bindEvents() {
      if (this.divMode) {
        this.divModeMixin__bindInputEvents();
      }
      this.baseMixin__bindKeywordDownEvents();
    },
    getRange() {
      let range;
      if (this.divMode) {
        range = this.divModeMixin__getRange();
      } else {
        range = this.inputModeMixin__getRange();
      }
      return range;
    },
    setRange(range) {
      this.range = range;
      if (this.divMode) {
        this.divModeMixin__setRange(range);
      } else {
        this.inputModeMixin__setRange(range);
      }
    },
    updateDOM() {
      if (this.divMode) {
        this.divModeMixin__updateDOM();
      } else {
        this.inputModeMixin__updateDOM();
      }
    },
    setQuery(query, range) {
      query = query.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (!query) {
        query = '';
      }
      this.inputModeMixin__query = query;
      this.expressionTree = this.expressionTreeInstance.getExpressionTree(query);
      this.suggestionInstance.initSuggestion(this.expressionTree, range, this.$node);

      this.updateDOM();
      if (range && this.baseMixin__editorStatus === DOM_EVENT_FOCUS) {
        this.setRange(range);
        this.getSuggestion();
      }
    },
    getcaretPosition: debounce(function() {
      let position = this.divMixin__getRangePosition();
      if (this.baseMixin__editorStatus !== DOM_EVENT_FOCUS || !position) return;
      const left = position.left - 5;
      const top = position.top + 20;
      const offset = this.config.offset;
      this.modalPos = { left, top, offset };
    }, 150),
    scrollToPreview() {
      const editorWidth = this.$el.offsetWidth;
      const domPreview = this.$el.querySelector('.ed_tk_preview');
      if (domPreview) {
        const previewWidth = domPreview.offsetWidth;
        if (editorWidth < this.modalPos.left + previewWidth) {
          this.$node.scrollLeft += (previewWidth + 30);
        }
      }
    },
    getSuggestion: debounce(function() {
      const range = this.getRange();
      const suggestionData = this.suggestionInstance.getSuggestionByCursor(range);
      this.updateSuggestionData(suggestionData);
      this.getcaretPosition();
      this.dropData = {};
    //   this.clearPreviewOption();
    }, 250),
    previewOption(dropData) {
      this.dropData = dropData;
    //   if (!this.divMode) {
    //     return;
    //   }
    //   this.suggestionInstance.previewSuggestion(dropData);
    //   this.scrollToPreview();
    },
    clearPreviewOption() {
      this.suggestionInstance.previewSuggestion();
    },
    selectOptionHandler(data) {
      this.dropData = data;
      this.putSelectedOptionIntoEditor();
    },
    putSelectedOptionIntoEditor() {
      if (!this.dropData.data) return;
      let { queryText, range } = this.suggestionInstance.getQueryTextWidthSuggeston(this.dropData);
      this.setQuery(queryText, range);
      this.fixFocus(range);
      this.dropData = {};
      this.divModeMixin__clearErrorTip();
    },
    fixFocus(range) {
      if (this.isInputing) return;
      setTimeout(()=>{
        this.$node.focus();
        this.setRange(range);
        this.getcaretPosition();
        if (this.divMode) {
          this.divMixin__scrollToFocus();
        } else {
          this.inputMixn__scrollToFocus(range);
        }
      }, 0);
    },
    updateSuggestionData(suggestionData) {
      let data = {
        query: this.inputModeMixin__query,
        suggestionData: suggestionData
      };
      this.$emit(EVENT_UPDATE_SUGGESTION_DATA, data);
    },
    updateQuery(query) {
      this.$emit(EVENT_UPDATE_QUERY, query);
    },
    // 用于父组件调用更新query
    setQueryFromParent(query) {
      let len = query.length || 0 ;
      let range = {
        start: len,
        end: len
      };
      this.setQuery(query, range);
    }
  }
};
</script>

<style lang="scss">
$green: #1d8820;
$neutral-grey-70: #616161 !default;
$neutral-grey-100: #111111 !default;

$background-color-error: #fae7ea;
$color-error: #c92239;

$background-color-field: #f4f5f7;
$color-field: $green;

$color-logic: $neutral-grey-70;

// 逻辑词错误延迟显示时间
$delay-lazy-render-error-on-logic: 1s;

/*
 * 用于延迟显示逻辑词错误
 */
@keyframes lazy-render-error-on-logic {
  0% {
    color: $color-logic;
    background-color: #fff;
    border: 1px solid #fff;
  }
  99% {
    color: $color-logic;
    background-color: #fff;
    border: 1px solid #fff;
  }
  100% {
    color: $color-error;
    background-color: $background-color-error;
    border: 1px solid $background-color-error;
  }
}


.editor-container{
    -webkit-user-modify: read-write-plaintext-only;
    border: 1px solid #eee;
    outline: none;
    width: 100%;
    height: 100%;
    padding: 0 8px;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 14px;
    &:empty:before{
        content: attr(placeholder);
        color:#bbb;
        line-height: 1;
        position: absolute;
        top: calc( 50% - 7px);
    }
    &:focus:before{
        display: none;
    }
    &.div-input{
         min-height: 42px;
        line-height: 42px;
        overflow-y:hidden; 
        white-space: pre;
        scrollbar-width: none;
        -webkit-scrollbar-width: none;
        &::-webkit-scrollbar{
            display: none;
        }
    }
    &.div-textarea, &.textarea{
        overflow: hidden;
        white-space: pre-wrap;
        word-break:break-word;
        line-height: 24px;
        max-height: 34px;
        min-height: 34px;
        display: block;
        padding-top:6px;
    }
    &.textarea{
        resize:none;
    }
    &.div-textarea{
        display: block;
        // scrollbar-width: none;
        // -webkit-scrollbar-width: none;
        // &::-webkit-scrollbar{
        //     display: none;
        // }
    }
    span{
        color: $neutral-grey-100;
        display: initial;
        min-width: 1px;
        &.ed_tk_preview:after{
            content: attr(preview-text);
            color: #aaa;
        }
    }
    .field{
        color: $color-field;
        background-color: $background-color-field;
        border: 1px solid $background-color-field;
        line-height: 100%;
        padding: 0 2px;
        border-radius: 3px;
        font-size: 14px;
        &.error{
            cursor: pointer;
            border: 1px solid rgba(0,0,0,0)
        }
        // &:hover{
            // border: 1px solid $green;
        // }
    }
    .logic {
        // font-style: italic;
        color: $color-logic;
        font-size: 14px;
        text-transform: uppercase;
    }
    .operate {
        color: #999;
        font-size: 18px;
    }
    span:empty{
        display: none;
    }
    .ed_position_token{
        display: inline !important;
    }
}
.ai-common-smart-search {
    position: relative;
    width: 100%;
    height: 100%;
    &--focus{
      .div-textarea{
        //   height: 100px;
          overflow-y: auto;
          overflow-x: hidden;
      }
      .textarea{
          height: 100px;
          overflow-y: auto;
          overflow-x: hidden;
      }
    }
    .editor-container--show-error {
      .error.logic,
      .error:not(.logic) {
        color: $color-error !important;
        background-color: $background-color-error !important;
        border: 1px solid $background-color-error !important;
        border-radius: 3px !important;
        font-size: 1em !important;
        padding: 0 2px !important;
        margin: 0 2px;
        span {
            color: $color-error !important;
        }
      }
      .error.logic {
        animation: $delay-lazy-render-error-on-logic lazy-render-error-on-logic;
      }
    }
}
.ai-common-smart-search--focus {
    .div-textarea,.textarea{
        max-height: 100px;
        line-height: 24px;
    }
}
.ai-common-smart-search--blur{
    .editor-container.div-textarea{
        display: block;
        scrollbar-width: none;
        -webkit-scrollbar-width: none;
        &::-webkit-scrollbar{
            display: none;
        }
    }
    .editor-container.textarea{
        scrollbar-width: none;
        -webkit-scrollbar-width: none;
        &::-webkit-scrollbar{
            display: none;
        }
    }
}
.suggestion-modal {
    position: absolute !important;
    z-index: 100;
    box-sizing: border-box;
}
.editor-container__textarea-placeholder{
    position: absolute;
    z-index: -1000;
    visibility: hidden;
    max-height: none !important;
    height: auto !important;
}
</style>

