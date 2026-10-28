import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiBreadcrumb, UiBreadcrumbItem } from '@white55/ui/breadcrumb'
import '@white55/ui/breadcrumb.css'

const meta = { title: 'UI/Breadcrumb', component: UiBreadcrumb } satisfies Meta<typeof UiBreadcrumb>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { UiBreadcrumb, UiBreadcrumbItem },
    template: '<div class="ui-story"><UiBreadcrumb separator="/"><UiBreadcrumbItem>Dashboards</UiBreadcrumbItem><UiBreadcrumbItem>Overview</UiBreadcrumbItem></UiBreadcrumb></div>',
  }),
}
