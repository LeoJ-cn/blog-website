export interface TrackPoint {
  /** WGS84 经度，范围为 -180 到 180。 */
  lng: number
  /** WGS84 纬度，范围为 -90 到 90。 */
  lat: number
  /** Unix 时间戳，单位为毫秒；轨迹点必须按该字段升序排列。 */
  timestamp: number
}

export type TrackPlaybackStatus =
  | 'idle' // 尚未播放或已经重置到起点。
  | 'playing' // requestAnimationFrame 正在推进轨迹时间。
  | 'paused' // 保留当前位置，等待继续播放。
  | 'finished' // 已到达最后一个轨迹点。
