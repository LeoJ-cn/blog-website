<i18n src="../locales/locales.json">
</i18n>
<template>
  <div :class="{
    'ai-common-suggestion-board': true,
    'ai-common-suggestion-board--default-status': defaultStatus
  }">
    <!-- TO FIX IE9 z-index -->
    <iframe src="" style="top: 0px; width: 100%; height: 100%; display: block; position: absolute; border: none; z-index: -100"></iframe>
      <Component
        v-for="({ section,title, content }) in suggestionList"
        :is="section === SECTION_TYPE_FIELD ? 'BlockFields': 'BlockSuggestion'"
        :key="section"
        :title="title"
        :items="content"
        :selected-index="selectedIndex"
        :onClick="onClick"
        :update-selected-index="updateSelectedIndex"
        :class="{
          'ai-common-suggestion-board__block': true,
          'ai-common-suggestion-normal': section !== SECTION_TYPE_KEYWORDS,
          'ai-common-suggestion-keywords': section === SECTION_TYPE_KEYWORDS,
          'ai-common-suggestion-sample':section === SECTION_TYPE_SAMPLE
        }" />

      <!-- 以下部分只会在 defaultStatus: true 时显示-->
      <BlockFields
        :title="$t('smartSearch.sections.keywordFields')"
        :items="keywordFields"
        :selected-index="selectedIndex"
        :onClick="onClick"
        :update-selected-index="updateSelectedIndex"
        class="ai-common-suggestion-board__block ai-common-suggestion-board__block--half-width"
        style="padding-right: 40px;" />

      <BlockFields
        :title="$t('smartSearch.sections.assigneeFields')"
        :items="assigneeFields"
        :selected-index="selectedIndex"
        :onClick="onClick"
        :update-selected-index="updateSelectedIndex"
        class="ai-common-suggestion-board__block ai-common-suggestion-board__block--half-width" />

      <BlockFields
        :title="$t('smartSearch.sections.classificationNumberFields')"
        :items="classificationNumberFields"
        :selected-index="selectedIndex"
        :onClick="onClick"
        :update-selected-index="updateSelectedIndex"
        class="ai-common-suggestion-board__block ai-common-suggestion-board__block--half-width"
        style="padding-right: 40px;" />

      <BlockFields
        :title="$t('smartSearch.sections.otherFields')"
        :items="otherFields"
        :selected-index="selectedIndex"
        :onClick="onClick"
        :update-selected-index="updateSelectedIndex"
        class="ai-common-suggestion-board__block ai-common-suggestion-board__block--half-width" />
      
      <div 
        v-if="defaultStatus"
        class="ai-common-suggestion-board__syntax-helper">
        <a href="javascript:void(0)" @mousedown="goSearchHelper">{{ $t('smartSearch.syntaxHelper') }}</a>
      </div>
  </div>
</template>

<script>
import get from 'lodash/get';
import includes from 'lodash/includes';
import forEach from 'lodash/forEach';
import { BlockSuggestion, BlockFields } from './blocks';
import {
  DEFAULT_KEYWORD_FIELDS,
  DEFAULT_ASSIGNEE_FIELDS,
  DEFAULT_CLASSIFICATION_NUMBER_FIELDS,
  DEFAULT_OTHER_FIELDS,
  SECTION_TYPE_FIELD,
  SECTION_TYPE_KEYWORDS,
  SECTION_TYPE_HISTORY,
  SECTION_TYPE_SAMPLE
} from '../constants';

export default {
  name: 'AiCommonSuggestionBoard',
  components: {
    BlockSuggestion,
    BlockFields
  },
  data() {
    return {
      keywordFields: [],
      assigneeFields: [],
      classificationNumberFields: [],
      otherFields: []
    };
  },
  props: {
    suggestion: {
      type: Array,
      default() {
        return [];
      }
    },
    selectedIndex: {
      type: Number,
      default: -1
    },
    defaultStatus: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    suggestionList() {
      const suggestion = this.suggestion.map((item) => {
        const title = this.$t(`smartSearch.sections.${item.section}`);
        return Object.assign({ title }, item);
      });
      // 默认状态下，只保留历史记录，这是为了防止外部错误传入
      if (this.defaultStatus) {
        return suggestion.filter(({ section }) => {
          return section === SECTION_TYPE_HISTORY;
        });
      }
      return suggestion;
    },
    lang() {
      const lang = get(this, '$i18n.locale', 'en');
      return lang;
    }
  },
  watch: {
    suggestion: {
      handler(items) {
        this.generateSampleGroupSuggestions(items);
      },
      immediate: true
    }
  },
  created() {
    this.SECTION_TYPE_FIELD = SECTION_TYPE_FIELD;
    this.SECTION_TYPE_KEYWORDS = SECTION_TYPE_KEYWORDS;
    this.SECTION_TYPE_SAMPLE = SECTION_TYPE_SAMPLE;
  },
  methods: {
    onClick(e, item) {
      this.$emit('select', item);
      e.preventDefault();
      e.stopPropagation();
    },
    generateSampleGroupSuggestions(items) {
      const { defaultStatus } = this;
      this.keywordFields = [];
      this.assigneeFields = [];
      this.classificationNumberFields = [];
      this.otherFields = [];

      if (!defaultStatus) return;

      forEach(items, ({ section, content }) => {
        if (section !== SECTION_TYPE_FIELD) return;
        forEach(content, (data) => {
          const { name } = data;
          if (includes(DEFAULT_KEYWORD_FIELDS, name)) {
            this.keywordFields.push(data);
          } else if (includes(DEFAULT_ASSIGNEE_FIELDS, name)) {
            this.assigneeFields.push(data);
          } else if (includes(DEFAULT_CLASSIFICATION_NUMBER_FIELDS, name)) {
            this.classificationNumberFields.push(data);
          } else if (includes(DEFAULT_OTHER_FIELDS, name)) {
            this.otherFields.push(data);
          }
        });
      });
    },
    updateSelectedIndex(index) {
      this.$emit('update-selected-index', index);
    },
    goSearchHelper() {
      window.open('/search_helper');
    }
  }
};
</script>
