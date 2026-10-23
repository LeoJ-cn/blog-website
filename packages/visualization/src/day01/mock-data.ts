export interface InspectionDatum {
  district: string
  today: number
  yesterday: number
}

export const inspectionData: InspectionDatum[] = [
  { district: '浦东', today: 128, yesterday: 96 },
  { district: '徐汇', today: 92, yesterday: 108 },
  { district: '静安', today: 76, yesterday: 68 },
  { district: '杨浦', today: 104, yesterday: 81 },
  { district: '闵行', today: 118, yesterday: 112 },
  { district: '嘉定', today: 63, yesterday: 72 },
]

export const lifecycleData = [42, 58, 47, 76, 69, 88, 94]

export const eventData = [
  { name: '道路破损', value: 36 },
  { name: '照明故障', value: 24 },
  { name: '垃圾堆积', value: 41 },
  { name: '井盖异常', value: 18 },
]
