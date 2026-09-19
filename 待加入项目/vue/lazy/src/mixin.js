const lazyComponentMixin = {
  data() {
    return {
      lazyComponentMixin_data: null,
      lazyComponentMixin_running: false,
      lazyComponentMixin_done: false
    };
  },
  props: {
    lazyTask: Function
  },
  methods: {
    async run() {
      this.lazyComponentMixin_running = true;
      try {
        this.lazyComponentMixin_data = await this.lazyTask();
      } catch (error) {
        // FIXME: 这里应该怎么写？ error 是什么类型
        console.error(error);
        throw new Error(error);
      }
      this.lazyComponentMixin_running = false;
      this.lazyComponentMixin_done = true;
      return true;
    }
  }
};

export default lazyComponentMixin;
