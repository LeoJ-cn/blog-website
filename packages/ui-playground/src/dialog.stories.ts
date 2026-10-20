import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { UiButton } from '@white55/ui/button'
import { UiDialog } from '@white55/ui/dialog'
import '@white55/ui/button.css'
import '@white55/ui/dialog.css'

const meta = {
  title: 'UI/Dialog',
  component: UiDialog,
  args: { title: '确认操作', width: '420px' },
} satisfies Meta<typeof UiDialog>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { UiButton, UiDialog },
    setup() {
      const visible = ref(false)
      return { args, visible }
    },
    template:
      '<div class="ui-story"><UiButton type="primary" @click="visible = true">打开对话框</UiButton><UiDialog v-model="visible" v-bind="args"><p>这里是对话框内容。</p><template #footer><UiButton @click="visible = false">取消</UiButton><UiButton type="primary" @click="visible = false">确认</UiButton></template></UiDialog></div>',
  }),
}
