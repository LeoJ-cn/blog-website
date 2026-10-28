import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiCard } from '@white55/ui/card'
import '@white55/ui/card.css'

const meta = { title: 'UI/Card', component: UiCard } satisfies Meta<typeof UiCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { UiCard },
    template: '<div class="ui-story"><UiCard class="ui-story__panel"><template #header>流量概览</template><p>面板使用柔和边框、克制圆角与轻量阴影。</p><template #footer>更新于刚刚</template></UiCard></div>',
  }),
}

export const Themes: Story = {
  render: () => ({
    components: { UiCard },
    template: '<div class="ui-story"><div class="ui-story__themes"><div class="ui-story__theme ui-theme" data-ui-theme="light"><UiCard header="浅色面板">白色表面与冷灰层级</UiCard></div><div class="ui-story__theme ui-theme" data-ui-theme="dark"><UiCard header="深色面板">同源的冷调深色层级</UiCard></div></div></div>',
  }),
}
