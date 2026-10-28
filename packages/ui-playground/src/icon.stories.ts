import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { Component } from 'vue'
import { computed, markRaw, shallowRef } from 'vue'
import { UiIcon } from '@white55/ui/icon'
import * as ElementPlusIcons from '@white55/ui/icons'
import { UiInput } from '@white55/ui/input'
import '@white55/ui/icon.css'
import '@white55/ui/input.css'

const iconEntries = Object.entries(ElementPlusIcons)
  .map(([name, component]) => ({
    name,
    component: markRaw(component as Component),
  }))
  .sort((left, right) => left.name.localeCompare(right.name))

const meta = {
  title: '基础组件/Icon',
  component: UiIcon,
  tags: ['autodocs'],
  args: {
    size: 24,
    color: '#2563eb',
  },
  render: (args) => ({
    components: {
      UiIcon,
      Search: ElementPlusIcons.Search,
    },
    setup() {
      return { args, searchIcon: ElementPlusIcons.Search }
    },
    template: `
      <div class="ui-story__row">
        <UiIcon v-bind="args" :icon="searchIcon" aria-label="搜索" />
        <UiIcon v-bind="args" aria-label="搜索">
          <Search />
        </UiIcon>
      </div>
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

export const IconCollection: Story = {
  render: () => ({
    components: { UiIcon, UiInput },
    setup() {
      const keyword = shallowRef('')
      const filteredIcons = computed(() => {
        const normalizedKeyword = keyword.value.trim().toLocaleLowerCase()

        if (!normalizedKeyword) return iconEntries

        return iconEntries.filter(({ name }) => name.toLocaleLowerCase().includes(normalizedKeyword))
      })

      return { filteredIcons, keyword }
    },
    template: `
      <div class="ui-story">
        <UiInput
          v-model="keyword"
          class="ui-story__field"
          clearable
          placeholder="搜索图标名称"
          aria-label="搜索图标名称"
        />
        <p class="ui-icon-gallery__summary">共 {{ filteredIcons.length }} 个图标</p>
        <div class="ui-icon-gallery">
          <div v-for="item in filteredIcons" :key="item.name" class="ui-icon-gallery__item">
            <UiIcon :icon="item.component" :size="24" aria-hidden="true" />
            <span>{{ item.name }}</span>
          </div>
        </div>
      </div>
    `,
  }),
}
