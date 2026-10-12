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
  /** optional transcript text overlapping this segment */
  transcriptText?: string
  /** true if filler words were detected and penalized in this segment */
  hasFillerWords?: boolean
  /** list of detected filler words */
  detectedFillers?: string[]
  /** true if segment matched priority keywords */
  isHighlight?: boolean
  /** list of matched priority keywords */
  matchedKeywords?: string[]
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
