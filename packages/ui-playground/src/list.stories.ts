import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiAvatar } from '@white55/ui/avatar'
import { UiList } from '@white55/ui/list'
import '@white55/ui/avatar.css'
import '@white55/ui/list.css'

const meta = { title: 'UI/List', component: UiList } satisfies Meta<typeof UiList>
export default meta
type Story = StoryObj<typeof meta>

const contacts = [
  { key: 'natali', name: 'Natali Craig', role: 'Designer' },
  { key: 'drew', name: 'Drew Cano', role: 'Developer' },
  { key: 'andi', name: 'Andi Lane', role: 'Product Manager' },
]

export const Contacts: Story = {
  render: () => ({
    components: { UiAvatar, UiList },
    setup: () => ({ contacts }),
    template: '<div class="ui-story"><div class="ui-story__panel"><UiList :items="contacts"><template #default="{ item }"><div class="ui-story__row"><UiAvatar size="small">{{ item.name.slice(0, 1) }}</UiAvatar><span>{{ item.name }}</span><small>{{ item.role }}</small></div></template></UiList></div></div>',
  }),
}

export const Empty: Story = {
  render: () => ({
    components: { UiList },
    template: '<div class="ui-story"><div class="ui-story__panel"><UiList :items="[]"><template #empty>暂无联系人</template></UiList></div></div>',
  }),
}
