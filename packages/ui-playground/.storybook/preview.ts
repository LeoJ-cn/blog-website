import type { Preview } from '@storybook/vue3-vite'
import '@white55/ui/style.css'
import '../src/storybook.css'

const preview: Preview = {
  decorators: [
    () => ({
      // Element Plus 弹层挂到 body，主题必须同时覆盖文档根节点。
      setup() {
        document.documentElement.dataset.uiTheme = 'light'
      },
      template: '<div class="ui-theme" data-ui-theme="light"><story /></div>',
    }),
  ],
}

export default preview
