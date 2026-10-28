import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiProgress } from '@white55/ui/progress'
import '@white55/ui/progress.css'

const meta = { title: 'UI/Progress', component: UiProgress } satisfies Meta<typeof UiProgress>
export default meta
type Story = StoryObj<typeof meta>

export const States: Story = {
  render: () => ({
    components: { UiProgress },
    template: '<div class="ui-story"><div class="ui-story__panel"><UiProgress :percentage="52" /><UiProgress :percentage="78" status="success" /><UiProgress :percentage="34" status="warning" /></div></div>',
  }),
}
