import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiStatistic } from '@white55/ui/statistic'
import '@white55/ui/statistic.css'

const meta = { title: 'UI/Statistic', component: UiStatistic } satisfies Meta<typeof UiStatistic>
export default meta
type Story = StoryObj<typeof meta>

export const DashboardMetrics: Story = {
  render: () => ({
    components: { UiStatistic },
    template: '<div class="ui-story"><div class="ui-story__row"><div class="ui-story__panel"><UiStatistic title="Views" :value="7265" group-separator="," /></div><div class="ui-story__panel"><UiStatistic title="Active Users" :value="2318" group-separator="," /></div></div></div>',
  }),
}
