import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiMenu, UiMenuItem } from '@white55/ui/menu'
import { UiSubMenu } from '@white55/ui/sub-menu'
import '@white55/ui/sub-menu.css'

const meta = { title: 'UI/SubMenu', component: UiSubMenu } satisfies Meta<typeof UiSubMenu>
export default meta
type Story = StoryObj<typeof meta>

export const NestedContext: Story = {
  render: () => ({
    components: { UiMenu, UiMenuItem, UiSubMenu },
    template: '<div class="ui-story"><div class="ui-story__panel"><UiMenu default-active="documents" :default-openeds="[\'pages\']"><UiSubMenu index="pages"><template #title>Pages</template><UiMenuItem index="profile">User Profile</UiMenuItem><UiMenuItem index="documents">Documents</UiMenuItem></UiSubMenu></UiMenu></div></div>',
  }),
}
