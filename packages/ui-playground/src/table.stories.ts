import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiTable, UiTableColumn } from '@white55/ui/table'
import '@white55/ui/table.css'

const rows = [
  { name: 'Button', status: '已接入' },
  { name: 'Table', status: '演示中' },
]
const meta = {
  title: 'UI/Table',
  component: UiTable,
  args: { data: rows, border: true, stripe: true },
} satisfies Meta<typeof UiTable>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: (args) => ({
    components: { UiTable, UiTableColumn },
    setup: () => ({ args, rows }),
    template:
      '<div class="ui-story"><UiTable :data="rows" v-bind="args"><UiTableColumn prop="name" label="组件" /><UiTableColumn prop="status" label="状态" /></UiTable></div>',
  }),
}
export const Empty: Story = {
  args: { data: [] },
  render: (args) => ({
    components: { UiTable, UiTableColumn },
    setup: () => ({ args }),
    template:
      '<div class="ui-story"><UiTable v-bind="args"><UiTableColumn prop="name" label="组件" /></UiTable></div>',
  }),
}
