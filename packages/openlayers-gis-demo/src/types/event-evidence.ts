export interface EventEvidenceMetadata {
  /** 当前事件内稳定唯一的附件 ID，用于关联独立 Blob Key。 */
  id: string
  /** 用户选择文件时的原始名称。 */
  name: string
  /** 浏览器报告的 MIME 类型；空字符串表示来源没有提供。 */
  mimeType: string
  /** 文件字节数，必须是大于或等于 0 的整数。 */
  sizeBytes: number
  /** 附件加入事件的时间，使用 ISO 8601 字符串。 */
  addedAt: string
}
