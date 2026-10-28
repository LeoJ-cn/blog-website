import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@white55/ui/button'
import { UiTooltip } from '@white55/ui/tooltip'
import '@white55/ui/button.css'
import '@white55/ui/tooltip.css'

const meta = { title: 'UI/Tooltip', component: UiTooltip } satisfies Meta<typeof UiTooltip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { UiButton, UiTooltip },
    template: '<div class="ui-story"><UiTooltip content="查看完整统计说明"><UiButton>悬停查看</UiButton></UiTooltip></div>',
  }),
}

export const LocalDarkTheme: Story = {
  render: () => ({
    components: { UiButton, UiTooltip },
    template: '<div class="ui-story"><div class="ui-story__theme ui-theme" data-ui-theme="dark"><UiTooltip><UiButton>深色说明</UiButton><template #content>Teleport 浮层继承局部深色主题</template></UiTooltip></div></div>',
  }),
}
