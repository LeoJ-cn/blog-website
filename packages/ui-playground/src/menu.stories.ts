import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiMenu, UiMenuItem, UiSubMenu } from '@white55/ui/menu'
import '@white55/ui/menu.css'

const meta = { title: 'UI/Menu', component: UiMenu } satisfies Meta<typeof UiMenu>
export default meta
type Story = StoryObj<typeof meta>

export const Navigation: Story = {
  render: () => ({
    components: { UiMenu, UiMenuItem, UiSubMenu },
    template: '<div class="ui-story"><div class="ui-story__panel"><UiMenu default-active="overview"><UiMenuItem index="overview">Overview</UiMenuItem><UiSubMenu index="projects"><template #title>Projects</template><UiMenuItem index="active-projects">Active Projects</UiMenuItem><UiMenuItem index="archive">Archive</UiMenuItem></UiSubMenu></UiMenu></div></div>',
  }),
}
