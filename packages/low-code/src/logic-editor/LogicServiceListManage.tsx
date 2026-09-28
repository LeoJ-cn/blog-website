import { ElEmpty, ElInput } from 'element-plus'
import { defineComponent } from 'vue'
import { useLowCodeContext } from '../compatibility/context'
import type { MethodRecord } from '../types/records'
import { service2NodeConfig } from './graph/util'
import style from './styles/logic-editor.module.scss'

export default defineComponent({
  name: 'LogicServiceListManage',
  data() {
    return { context: useLowCodeContext(), services: [] as MethodRecord[], keyword: '' }
  },
  computed: {
    filtered(): MethodRecord[] {
      const key = this.keyword.trim().toLowerCase()
      return key ? this.services.filter((item) => `${item.label}${item.name}`.toLowerCase().includes(key)) : this.services
    },
  },
  async mounted() {
    this.services = await this.context.controller.getApis() as MethodRecord[]
  },
  methods: {
    onDragstart(event: DragEvent, service: MethodRecord) {
      if (!event.dataTransfer) return
      const model = service2NodeConfig(service)
      event.dataTransfer.setData('dragComponent', JSON.stringify({ type: model.type, model: JSON.stringify(model) }))
    },
  },
  render() {
    return (
      <section class={style.logicMenuOverflow}>
        <ElInput modelValue={this.keyword} onInput={(value) => { this.keyword = String(value) }} placeholder="搜索 API" clearable />
        {!this.filtered.length ? <ElEmpty description="暂无 API" /> : this.filtered.map((service) => (
          <div class={style.logicListItem} draggable onDragstart={(event) => this.onDragstart(event, service)}>
            <span>{service.label || service.name}</span>
          </div>
        ))}
      </section>
    )
  },
})
