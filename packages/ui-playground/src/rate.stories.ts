import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { UiRate } from '@white55/ui/rate'
import '@white55/ui/rate.css'

const meta = {
  title: 'UI/Rate',
  component: UiRate,
  args: { max: 5, disabled: false, readonly: false, allowHalf: false, clearable: true },
} satisfies Meta<typeof UiRate>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { UiRate },
    setup() {
      const rating = ref(3)
      return { args, rating }
    },
    template:
      '<div class="ui-story"><UiRate v-model="rating" v-bind="args" /><span>当前评分：{{ rating }} / {{ args.max }}</span></div>',
  }),
}

export const HalfStar: Story = {
  args: { allowHalf: true, modelValue: 3.5 },
}

export const Readonly: Story = {
  args: { readonly: true, modelValue: 4 },
}
