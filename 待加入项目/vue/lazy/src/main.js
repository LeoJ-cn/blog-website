require('intersection-observer');

import { rootElement } from './directive';

export default {
  name: 'AiCommonLazy',
  render(h) {
    const data = {
      class: {
        'common-lazy': true,
        'common-lazy--running': this.running,
        'common-lazy--done': this.done
      }
    };
    if (this.visible) {
      return h(this.tag, data, [this.$scopedSlots.default ? this.$scopedSlots.default({
        data: this.data
      }) : this.$slots.default]);
    }
    return h(this.tag, data);
  },
  data() {
    return {
      data: null,
      running: false,
      done: false,
      io: null,
      visible: false
    };
  },
  props: {
    tag: {
      type: String,
      default: 'div'
    },
    options: {
      type: Object,
      default() {
        return {};
      }
    },
    lazyTask: {
      type: Function
    }
  },
  mounted() {
    this.on();
  },
  destroy() {
    this.off();
  },
  computed: {
    rootElement() {
      return rootElement(this.root);
    },
    ioOptions() {
      const {
        margin = '0px 0px 0px 0px',
        thresholds = [0],
        delay = 500,
        root
      } = this.options;

      return {
        root: rootElement(root),
        margin,
        thresholds,
        delay
      };
    }
  },
  methods: {
    on() {
      const io = new IntersectionObserver((entries) => {
        const entry = entries[0];
        // 如果不相交或者已加载
        if ((entry.intersectionRatio === 0 && !entry.isIntersecting) || this.visible) {
          clearTimeout(this.delayId);
          return;
        }
        this.delayId = setTimeout(async() => {
          this.visible = await this.run();
        }, this.ioOptions.delay);
      }, this.ioOptions);
      io.observe(this.$el);
      this.io = io;
    },
    off() {
      this.io.unobserve(this.$el);
      clearTimeout(this.delayId);
    },
    async run() {
      if (!this.lazyTask) {
        return true;
      }
      this.running = true;
      try {
        this.data = await this.lazyTask();
      } catch (error) {
        throw new Error(error);
      }
      this.running = false;
      this.done = true;
      return true;
    }
  }
};
