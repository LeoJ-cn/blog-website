import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { shallowRef } from 'vue'
import { UiTabPane, UiTabs } from '@white55/ui/tabs'
import '@white55/ui/tabs.css'

const meta = { title: 'UI/Tabs', component: UiTabs } satisfies Meta<typeof UiTabs>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { UiTabPane, UiTabs },
    setup() {
      const active = shallowRef('users')
      return { active }
    },
    template: '<div class="ui-story"><div class="ui-story__panel"><UiTabs v-model="active"><UiTabPane label="Total Users" name="users">用户趋势内容</UiTabPane><UiTabPane label="Total Projects" name="projects">项目趋势内容</UiTabPane><UiTabPane label="Operating Status" name="status">运行状态内容</UiTabPane></UiTabs></div></div>',
  }),
}
