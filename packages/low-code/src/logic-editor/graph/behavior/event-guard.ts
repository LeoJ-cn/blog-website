import type { IG6GraphEvent, Item } from '@antv/g6';

/**
 * G6 的公开事件类型允许 `item` 为空，但节点和边事件在运行时必须携带目标元素。
 * 在行为入口统一校验，避免把不安全断言传播到具体状态更新逻辑。
 */
export function getEventItem(event: IG6GraphEvent, context: string): Item {
  if (!event.item) {
    throw new Error(`${context} 缺少目标图元素`);
  }
  return event.item;
}
