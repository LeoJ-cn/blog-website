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

export type TrackPlaybackSpeed =
  | 1 // 按 Mock 轨迹时间戳的原始速度播放。
  | 2 // 以两倍时间推进，适合观察插值过程。
  | 8 // 以八倍时间推进，适合快速完成整段轨迹演示。
