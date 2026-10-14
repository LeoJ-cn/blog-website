/** GIS 演示数据的固定量级；字符串值同时用于页面选项和持久化 namespace。 */
export type GisDatasetScale = '1k' | '10k' | '50k' | '100k'

export const GIS_DATASET_SCALES = ['1k', '10k', '50k', '100k'] as const satisfies readonly GisDatasetScale[]

/** 首次访问且没有已保存设置时加载 10,000 条事件。 */
export const DEFAULT_GIS_DATASET_SCALE: GisDatasetScale = '10k'

/** 每个量级对应的基准事件容量，单位为条；用户修改后真实数量允许偏离该值。 */
export const GIS_DATASET_SIZE_BY_SCALE: Readonly<Record<GisDatasetScale, number>> = {
  '1k': 1_000,
  '10k': 10_000,
  '50k': 50_000,
  '100k': 100_000,
}

export function isGisDatasetScale(value: unknown): value is GisDatasetScale {
  return typeof value === 'string' && GIS_DATASET_SCALES.includes(value as GisDatasetScale)
}

export function getDatasetSize(scale: GisDatasetScale): number {
  return GIS_DATASET_SIZE_BY_SCALE[scale]
}
