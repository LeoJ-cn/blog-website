import SuggestionBoard from '../smart-search/src/components/suggestion-board.vue';

/* istanbul ignore next */
SuggestionBoard.install = function(Vue) {
  Vue.component(SuggestionBoard.name, SuggestionBoard);
};

export default SuggestionBoard;
