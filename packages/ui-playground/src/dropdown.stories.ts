import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@white55/ui/button'
import { UiDropdown, UiDropdownItem, UiDropdownMenu } from '@white55/ui/dropdown'
import '@white55/ui/button.css'
import '@white55/ui/dropdown.css'

const meta = { title: 'UI/Dropdown', component: UiDropdown } satisfies Meta<typeof UiDropdown>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { UiButton, UiDropdown, UiDropdownItem, UiDropdownMenu },
    template: '<div class="ui-story"><UiDropdown><UiButton>更多操作</UiButton><template #dropdown><UiDropdownMenu><UiDropdownItem command="edit">编辑</UiDropdownItem><UiDropdownItem command="archive">归档</UiDropdownItem><UiDropdownItem command="delete" divided>删除</UiDropdownItem></UiDropdownMenu></template></UiDropdown></div>',
  }),
}

export const LocalDarkTheme: Story = {
  render: () => ({
    components: { UiButton, UiDropdown, UiDropdownItem, UiDropdownMenu },
    template: '<div class="ui-story"><div class="ui-story__theme ui-theme" data-ui-theme="dark"><span>浮层应继承当前深色容器</span><UiDropdown><UiButton>打开深色菜单</UiButton><template #dropdown><UiDropdownMenu><UiDropdownItem>Overview</UiDropdownItem><UiDropdownItem>Projects</UiDropdownItem></UiDropdownMenu></template></UiDropdown></div></div>',
  }),
}
