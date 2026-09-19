<i18n src="../locales/locales.json">
</i18n>
<template>
    <div
      :style="errorModalPos"
      class="error-modal-container"
      @mouseenter="toggleErrorShow(true)"
      @mouseleave="toggleErrorShow(false)">
        <div class="error-label">{{$tc('smartSearch.errorsTipNum', errorModalData.count,{num: errorModalData.count})}}</div>
        <div class="error-conent__container"
            v-show="errorModalData.htmlStr&&showErrorContent">
            <div
            v-html="errorModalData.htmlStr"
            :class="[CLASS_NAME_ERROR_CONTENT]">
            </div>
        </div>
        <error-tip
          v-if="errorTipData&&errorTipData.errorCode"
          :error-data="errorTipData">
        </error-tip>
    </div>
</template>

<script>
import $ from 'jquery';
import errorTip from './errorTip';
import { get, debounce } from 'lodash';
import {
  DOM_EVENT_MOUSE_MOVE,
  DOM_EVENT_MOUSE_LEAVE
} from '../constants';

const CLASS_NAME_ERROR_CONTENT = 'error-content';
const SELECTOR_ERROR_CONTENT = `.${CLASS_NAME_ERROR_CONTENT}`;
let vm;
export default {
  components: {
    errorTip
  },
  props: {
    errorModalData: {
      type: Object
    },
    editorStatus: {
      type: String
    },
    config: {
      type: Object
    }
  },
  data() {
    return {
      showErrorContent: false,
      errorTipData: {},
      errorModalPos: {
        width: `calc(100% + ${get(this.config, 'offset.right')}px)`,
        right: -`${get(this.config, 'offset.right')}px`
      }
    };
  },
  methods: {
    bindEvents() {
      let self = this;
      $(SELECTOR_ERROR_CONTENT).off(DOM_EVENT_MOUSE_MOVE).on(DOM_EVENT_MOUSE_MOVE, '.error', function(e) {
        let scrollTop = $(window).scrollTop();
        const left = `${e.pageX + 10}px`;
        const top = `${e.pageY - scrollTop + 20}px`;
        self.$set(self.errorTipData, 'errorCode', $(this).data('error-code'));
        self.$set(self.errorTipData, 'pos', { left, top });
      });
      $(SELECTOR_ERROR_CONTENT).off(DOM_EVENT_MOUSE_LEAVE).on(DOM_EVENT_MOUSE_LEAVE, '.error', function() {
        self.errorTipData = {};
      });
    },
    toggleErrorShow: debounce((status) =>{
      vm.showErrorContent = status;
    }, 300)
  },
  created() {
    this.CLASS_NAME_ERROR_CONTENT = CLASS_NAME_ERROR_CONTENT;
    vm = this;
  },
  mounted() {
    this.bindEvents();
  }
};
</script>

