// TMCut Edit Decision List (EDL) types — the contract between media
// analysis / AI and the timeline (docs sections 38-40, 66).

export interface TmcutEdlSegment {
  /** seconds, media time */
  start: number
  /** seconds, media time */
  end: number
  /** 0..1 keep-score */
  score: number
  reason: string
  /** optional representative timestamp, seconds */
  thumb?: number
}

export type TmcutAutocutProfile = 'viral-shorts' | 'podcast-summary' | 'cinematic-vlog'

export interface TmcutEdl {
  version: 1
  assetId: string
  profile: TmcutAutocutProfile
  segments: TmcutEdlSegment[]
  createdAt: string
  analyzerVersion: string
}
