require('intersection-observer');

const LAZY_TASK = 'lazyTask';
const RUN = 'run';
const isFunction = (value) => {
  return typeof value === 'function';
};

export const rootElement = (root) => {
  if (typeof root === 'string') {
    return document.querySelector(root);
  } else if (root instanceof Element) {
    return root;
  }
  return null;
};

export default {
  inserted(el, binding, vnode) {
    let { arg, value = {} } = binding;
    const { child: vm } = vnode;
    // 未指定延迟执行的函数时，如果组件包含名为 'lazyTask' 的方法，则自动设定延迟执行函数为 run
    if (!arg && isFunction(vm[LAZY_TASK])) {
      arg = RUN;
    }
    const lazyFn = vm[arg];
    if (!lazyFn) {
      throw new Error(`no method called: '${arg}'`);
    }

    const {
      root,
      margin = '0px 0px 0px 0px',
      thresholds = [0],
      delay = 500
    } = value || {};

    const options = {
      root: rootElement(root),
      margin,
      thresholds
    };

    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      // 如果不相交或者已加载
      if ((entry.intersectionRatio === 0 && !entry.isIntersecting) || vm.$_lazy) {
        clearTimeout(vm.$_delay);
        return;
      }
      vm.$_delay = setTimeout(async() => {
        let bool = false;
        try {
          bool = await lazyFn();
        } catch (e) {
          bool = false;
        }
        vm.$_lazy = bool;
      }, delay);
    }, options);
    io.observe(el);

    vm.io = io;
    vm.$_lazy = false;
    vm.$_delay = undefined;
  },
  unbind(el, binding, vnode) {
    const { child: vm } = vnode;
    vm.io.unobserve(el);
    clearTimeout(vm.$_delay);
  }
};
