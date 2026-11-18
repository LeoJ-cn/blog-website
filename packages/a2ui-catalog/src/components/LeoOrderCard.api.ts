import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

export const LeoOrderCardApi = {
  name: 'LeoOrderCard',
  schema: z.object({
    orderNo: CommonSchemas.DynamicString,
    amount: CommonSchemas.DynamicNumber,
    onView: CommonSchemas.Action,
    checks: CommonSchemas.Checkable.shape.checks,
  }),
}
