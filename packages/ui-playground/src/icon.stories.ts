import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiIcon } from '@white55/ui/icon'
import '@white55/ui/icon.css'

const meta = {
  title: '基础组件/Icon',
  component: UiIcon,
  tags: ['autodocs'],
  args: {
    size: 24,
    color: '#2563eb',
  },
  render: (args) => ({
    components: { UiIcon },
    setup() {
      return { args }
    },
    template: `
      <UiIcon v-bind="args" aria-label="收藏">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="m12 17.27 5.18 3.13-1.37-5.89 4.57-3.96-6.02-.51L12 4.5 9.64 10.04l-6.02.51 4.57 3.96-1.37 5.89L12 17.27Z"
          />
        </svg>
      </UiIcon>
    `,
  }),
} satisfies Meta<typeof UiIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const CustomSizeAndColor: Story = {
  args: {
    size: '2rem',
    color: '#7c3aed',
  },
}
