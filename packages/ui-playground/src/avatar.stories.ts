import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiAvatar } from '@white55/ui/avatar'
import '@white55/ui/avatar.css'

const meta = { title: 'UI/Avatar', component: UiAvatar } satisfies Meta<typeof UiAvatar>
export default meta
type Story = StoryObj<typeof meta>

export const SizesAndFallback: Story = {
  render: () => ({
    components: { UiAvatar },
    template: '<div class="ui-story"><div class="ui-story__row"><UiAvatar size="small">L</UiAvatar><UiAvatar>Leo</UiAvatar><UiAvatar :size="52" shape="square">UI</UiAvatar></div></div>',
  }),
}
