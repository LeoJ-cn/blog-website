import $ from 'jquery';
import omit from 'lodash/omit';
import get from 'lodash/get';

const OMIT_ATTRS = ['title', 'items', 'selected-index', 'onClick'].map(name => `attrs.${name}`);
const CLASS_NAME_SUGGESTION_BLOCK_TITLE = 'ai-common-suggestion-board__block-title';
const CLASS_NAME_SUGGESTION_FIELD_ITEM_VALUE = 'ai-common-suggestion-field-item__value';
const EVENT_MOUSEENTER = 'mouseenter';
const EVENT_MOUSELEAVE = 'mouseleave';

const SuggestionItem = { // eslint-disable-line
  name: 'SuggestionItem',
  props: {
    tag: {
      type: String,
      default: 'li'
    },
    selected: {
      type: Boolean,
      default: false
    },
    tooltip: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      tooltipVisible: false
    };
  },
  created() {
    const vm = this;
    this.mouseenter = function(event) {
      if (!vm.tooltip) {
        vm.tooltipVisible = false;
        return;
      }
      const { currentTarget } = event;
      if (currentTarget && currentTarget.scrollWidth > currentTarget.clientWidth + 1) {
        vm.tooltipVisible = true;
      } else {
        vm.tooltipVisible = false;
      }
    };
    this.mouseleave = function(/* event */) {
      vm.tooltipVisible = false;
    };
  },
  mounted() {
    this.jq = $(this.$el);
    this.jq.on(EVENT_MOUSEENTER, `.${CLASS_NAME_SUGGESTION_FIELD_ITEM_VALUE}`, this.mouseenter);
    this.jq.on(EVENT_MOUSELEAVE, `.${CLASS_NAME_SUGGESTION_FIELD_ITEM_VALUE}`, this.mouseleave);
  },
  destoryed() {
    this.jq.off(EVENT_MOUSEENTER, `.${CLASS_NAME_SUGGESTION_FIELD_ITEM_VALUE}`, this.mouseenter);
    this.jq.off(EVENT_MOUSELEAVE, `.${CLASS_NAME_SUGGESTION_FIELD_ITEM_VALUE}`, this.mouseleave);
  },
  render(h) {
    const { selected, tooltip, tooltipVisible, showEllipsis } = this;
    const klass = {
      'ai-common-suggestion-item': true,
      'ai-common-suggestion-item--selected': selected
    };
    return h(this.tag, {
      class: klass
    }, [
      this.$slots.default,
      tooltipVisible ? h('div', {
        directives: [{
          name: 'show-more'
        }],
        class: {
          'ai-common-suggestion-item__tooltip': true
        },
        domProps: {
          innerHTML: `<p class="ai-common-suggestion-item__tooltip-content">${tooltip}<span class="ai-common-suggestion-item__tooltip-ellipsis">...</span></p>`
        }
      }) : null
    ]);
  },
  directives: {
    'show-more': {
      inserted(el) {
        let contentHeight = el.querySelector('p').scrollHeight;
        if (contentHeight > 165) {
          $(el).find('.ai-common-suggestion-item__tooltip-ellipsis').show();
        }
      }
    }
  }
};

const formatValue = (value) => {
  let temp = parseFloat(value);
  if (temp > 999999999) {
    return `${Math.round(temp / 10000000) / 100}B`;
  } if (temp > 99999999) {
    return `${Math.round(temp / 1000000)}M`;
  } if (temp > 9999999) {
    return `${Math.round(temp / 100000) / 10}M`;
  } if (temp > 999999) {
    return `${Math.round(temp / 10000) / 100}M`;
  } if (temp > 99999) {
    return `${Math.round(temp / 1000)}K`;
  } if (temp > 9999) {
    return `${Math.round(temp / 100) / 10}K`;
  }
  return String(value).replace(/\B(?=(\d{3})+$)/g, ',');
};

const BlockSuggestion = {
  functional: true,
  render(h, context) {
    const { title, items, selectedIndex, onClick, updateSelectedIndex } = context.props;
    if (!items || items.length === 0) return;
    const { lang } = context.parent;
    const data = omit(context.data, OMIT_ATTRS);
    return <ul { ...data } >
      <h5 class={[CLASS_NAME_SUGGESTION_BLOCK_TITLE]}>{title}</h5>
      {
        items.map(item => {
          const value = item.html || item.name || item.value;
          const description = item.description || item.label || get(item.desc, lang);
          const count = item.count;
          return <SuggestionItem
            tooltip = { value }
            selected={ item.index === selectedIndex }
            nativeOnMousedown={ event => onClick(event, item) }
            nativeOnMouseenter={() => updateSelectedIndex(item.index)}
            nativeOnMouseleave={() => updateSelectedIndex(-1)}
            class={{
              'ai-common-suggestion-field-item': true,
              'ai-common-suggestion-field-item--render-count': count
            }}>
            <span domPropsInnerHTML={value}
              class={[CLASS_NAME_SUGGESTION_FIELD_ITEM_VALUE]} />
            {
              description ? <span class="ai-common-suggestion-field-item__description">{ description }</span> : null
            }
            {
              count ? <span class="ai-common-suggestion-field-item__count"><span>≈</span> { formatValue(count) }</span> : null
            }
          </SuggestionItem>;
        })
      }
    </ul>;
  }
};

const BlockFields = {
  functional: true,
  render(h, context) {
    const { title, items, selectedIndex, onClick, updateSelectedIndex } = context.props;
    if (!items || items.length === 0) return;
    const { lang } = context.parent;
    const data = omit(context.data, OMIT_ATTRS);
    return <ul { ...data } >
      <h5 class={[CLASS_NAME_SUGGESTION_BLOCK_TITLE]}>{title}</h5>
      {
        items.map(item => {
          const value = item.html || item.name || item.value;
          const description = item.description || item.label || get(item.desc, lang);
          // const description = get(item.desc, lang);
          return <SuggestionItem
            tooltip = { value }
            selected={ item.index === selectedIndex }
            nativeOnMousedown={ event => onClick(event, item) }
            nativeOnMouseenter={() => updateSelectedIndex(item.index)}
            nativeOnMouseleave={() => updateSelectedIndex(-1)}
            class="ai-common-suggestion-field-item">
            <span domPropsInnerHTML={value}
              class="ai-common-suggestion-field-item__label" />
            <span class="ai-common-suggestion-field-item__description">{description}</span>
          </SuggestionItem>;
        })
      }
    </ul>;
  }
};

export {
  BlockFields,
  BlockSuggestion
};
