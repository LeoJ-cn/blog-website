import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiTrend } from '@white55/ui/trend'
import '@white55/ui/trend.css'

const meta = { title: 'UI/Trend', component: UiTrend } satisfies Meta<typeof UiTrend>
export default meta
type Story = StoryObj<typeof meta>

export const Directions: Story = {
  render: () => ({
    components: { UiTrend },
    template: '<div class="ui-story"><div class="ui-story__row"><UiTrend :value="11.01" /><UiTrend :value="-0.03" /><UiTrend :value="0" /><UiTrend :value="-4.2" direction="up" label="下降代表响应时间改善 4.2%" /></div></div>',
  }),
}
