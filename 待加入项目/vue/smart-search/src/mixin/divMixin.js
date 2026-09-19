import $ from 'jquery';
import { debounce, filter, startsWith, sortBy, get } from 'lodash';
import { getRange, setRange } from 'selection-ranges';
import { getHtmlStrByExpressionTree } from '../core/utils/smartSearchUtils';
import { FIELDS_LIST } from '../core/config/index';
import {
  DOM_EVENT_COMPOSITION_START,
  DOM_EVENT_COMPOSITION_END,
  DOM_EVENT_INPUT,
  DOM_EVENT_MOUSE_MOVE,
  DOM_EVENT_MOUSE_LEAVE,
  DOM_EVENT_CLICK,
  CLASS_NAME_FIELD_TO_BE_FIXED,
  SELECTOR_FIELD_TO_BE_FIXED,
  SELECTOR_EDITOR_CONTAINER
} from '../constants';

export default {
  data() {
    return {
      divModeMixin__isInputing: false,
      divModeMixin__errorTipData: {},
      range: {
        start: 0,
        end: 0
      }
    };
  },
  methods: {
    divModeMixin__bindInputEvents() {
      let vm = this;
      // 中文输入时需要使用该事件
      this.$editor
        .off(DOM_EVENT_COMPOSITION_START).on(DOM_EVENT_COMPOSITION_START, () => {
          this.divModeMixin__isInputing = true;
        })
        .off(DOM_EVENT_COMPOSITION_END).on(DOM_EVENT_COMPOSITION_END, () => {
          this.divModeMixin__isInputing = false;
        })
        .off(DOM_EVENT_INPUT).on(DOM_EVENT_INPUT, this.divModeMixin__preUpdateQuery);

      this.$editor.parent('.ai-common-smart-search')
        .off(DOM_EVENT_MOUSE_LEAVE).on(DOM_EVENT_MOUSE_LEAVE, '.editor-container--show-error .error', this.divModeMixin__clearErrorTip)
        .off(DOM_EVENT_MOUSE_MOVE).on(DOM_EVENT_MOUSE_MOVE, '.editor-container--show-error .error', function(e) {
          vm.divModeMixin__showErrorTip(this, e);
        })
        .off(DOM_EVENT_CLICK).on(DOM_EVENT_CLICK, '.editor-container--show-error .field.error', function() {
          let errorCode = $(this).attr('data-error-code');
          if (errorCode === '10001') {
            vm.divModeMixin__clearErrorTip();
            vm.divModeMixin__showAlternativeFields(this);
          }
        });
    },
    divModeMixin__preUpdateQuery: debounce(function() {
      if (this.divModeMixin__isInputing) return;
      let query = this.$node.textContent;
      query = query.replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      this.inputModeMixin__query = query;
      this.divModeMixin__updateQuery();
      this.updateQuery(query);
      this.isInputing = true;
    }, 10),
    divModeMixin__updateQuery: debounce(function() {
      if (this.divModeMixin__isInputing) return;
      const range = this.divModeMixin__getRange();
      let query = this.$node.textContent;
      query = query.replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      this.isInputing = false;
      this.setQuery(query, range);
      this.divModeMixin__clearErrorTip();
    }, 250),
    divModeMixin__updateDOM() {
      if (this.divModeMixin__isInputing) return;
      let htmlStr = getHtmlStrByExpressionTree(this.expressionTree);
      this.$node.innerHTML = htmlStr;
    },
    divMixin__scrollToFocus() {
      let position = this.divMixin__getRangePosition();
      if (!position) return;
      let tdHeight = position.height;
      let tdTop = position.top;
      let editorHeight = this.$el.offsetHeight;
      let scrollTop = this.$node.scrollTop;
      if (editorHeight + scrollTop < tdHeight + tdTop + 30) {
        this.$node.scrollTop = tdHeight + tdTop - editorHeight + 30;
      }
    },
    divMixin__getRangePosition() {
      let cursorWordData = this.suggestionInstance.getCursorWordData(this.range);
      let tokenId = get(cursorWordData, 'cursorToken.data.id');
      let nextToken = '<span class="ed_position_token"></span>';
      $(`.ed_tk_${tokenId}`).append(nextToken);
      const focusDom = this.$el.querySelector('.ed_position_token');
      let position = {
        height: 0,
        width: 0,
        top: 0,
        left: 0
      };
      if (tokenId && focusDom) {
        position = {
          height: focusDom.offsetHeight,
          width: focusDom.offsetWidth,
          top: focusDom.offsetTop,
          left: focusDom.offsetLeft
        };
        $('.editor-container').find('.ed_position_token').remove();
        return position;
      }
      $('.editor-container').find('.ed_position_token').remove();
    },
    divModeMixin__setRange(range) {
      setRange(this.$node, range);
    },
    divModeMixin__getRange() {
      return getRange(this.$node);
    },
    divModeMixin__clearFieldList() {
      this.fieldList = [];
      const range = this.range || this.divModeMixin__getRange();
      let query = this.$node.textContent;
      this.setQuery(query, range);
    },
    divModeMixin__getSuggestFields(value) {
      let maxChar = 0;
      let suggestWords = [];
      let maxWords = 0;
      for (let i = 0; i <= value.length; i++) {
        maxChar = i;
        suggestWords = filter(FIELDS_LIST, (item) => {
          return startsWith(item, value.substring(0, maxChar + 1).toUpperCase());
        });
        if (i === value.length) {
          maxChar = value.length;
        }
        if (suggestWords.length <= maxWords) {
          break;
        }
      }
      suggestWords = filter(FIELDS_LIST, (item) => {
        return startsWith(item, value.substring(0, maxChar).toUpperCase());
      });
      suggestWords = sortBy(suggestWords, (item) => {
        return item;
      });
      return suggestWords;
    },
    divModeMixin__clearErrorTip() {
      this.divModeMixin__errorTipData = {};
    },
    divModeMixin__showErrorTip(dom, e) {
      const $jq = $(dom);
      if ($jq.hasClass(CLASS_NAME_FIELD_TO_BE_FIXED)) {
        return;
      }
      let scrollTop = $(window).scrollTop();
      const left = `${e.pageX + 10}px`;
      const top = `${e.pageY - scrollTop + 20}px`;
      this.$set(this.divModeMixin__errorTipData, 'errorCode', $jq.data('error-code'));
      this.$set(this.divModeMixin__errorTipData, 'pos', { left, top });
    },
    divModeMixin__showAlternativeFields(dom) {
      this.range = this.divModeMixin__getRange();
      const $jq = $(dom);
      if ($jq.hasClass(CLASS_NAME_FIELD_TO_BE_FIXED)) {
        $jq.removeClass(CLASS_NAME_FIELD_TO_BE_FIXED);
        this.fieldList = [];
        return;
      }
      const { offsetLeft, offsetTop, offsetHeight } = dom;
      let $editorContainer = $jq.parents(SELECTOR_EDITOR_CONTAINER)[0];
      let top = `${offsetHeight + offsetTop - $editorContainer.scrollTop }px`;
      let left = `${offsetLeft - $editorContainer.scrollLeft - 20}px`;
      $(SELECTOR_FIELD_TO_BE_FIXED).removeClass(CLASS_NAME_FIELD_TO_BE_FIXED);
      $jq.addClass(CLASS_NAME_FIELD_TO_BE_FIXED);
      let text = $jq.text();
      this.fieldList = this.divModeMixin__getSuggestFields(text);
      this.fieldListPos = { top, left };
    }

  }
};
