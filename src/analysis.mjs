// =============================================================================
//  @tmcut/core — analysis
//  Pure media-analysis helpers for AutoCut (docs sections 39-40, Phase 16).
//  The Electron runtime executes ffmpeg and returns RAW stderr text; this
//  module parses it and scores segments per AutoCut profile. No process,
//  no filesystem, no network — fully unit-tested.
// =============================================================================

/**
 * Parse `select='gt(scene,N)',showinfo` stderr into shot segments.
 * showinfo prints `pts_time:<sec>` per scene cut; shots span consecutive
 * cuts, the tail ending at durationSec.
 */
export function parseSceneOutput(stderrText, durationSec) {
  const text = String(stderrText ?? '')
  const duration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0
  const cuts = [0]
  const pattern = /pts_time:(\d+(?:\.\d+)?)/g
  let match = pattern.exec(text)
  while (match) {
    const time = Number(match[1])
    if (Number.isFinite(time) && time > 0.04 && time > cuts[cuts.length - 1] + 0.04) {
      cuts.push(time)
    }
    match = pattern.exec(text)
  }
  const end = duration > 0 ? duration : cuts[cuts.length - 1]
  const segments = []
  for (let i = 0; i < cuts.length; i += 1) {
    const start = cuts[i]
    const stop = i + 1 < cuts.length ? cuts[i + 1] : end
    if (stop - start >= 0.2) segments.push({ start: round3(start), end: round3(stop) })
  }
  return segments
}

/**
 * Parse `silencedetect` stderr into silence ranges [{ start, end }].
 * Dangling silence_start (no end before EOF) closes at durationSec.
 */
export function parseSilenceOutput(stderrText, durationSec) {
  const text = String(stderrText ?? '')
  const duration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0
  const ranges = []
  const pattern = /silence_(start|end):\s*(-?[\d.]+)/g
  let match = pattern.exec(text)
  let open = null
  while (match) {
    const time = Number(match[2])
    if (match[1] === 'start') {
      if (open === null && Number.isFinite(time)) open = Math.max(0, time)
    } else if (open !== null && Number.isFinite(time) && time > open) {
      ranges.push({ start: round3(open), end: round3(time) })
      open = null
    }
    match = pattern.exec(text)
  }
  if (open !== null && duration > open) {
    ranges.push({ start: round3(open), end: round3(duration) })
  }
  return ranges
}

function round3(value) {
  return Math.round(value * 1000) / 1000
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** Total overlap (seconds) between [start, end] and a range list. */
export function overlapDuration(start, end, ranges) {
  let total = 0
  for (const range of ranges ?? []) {
    const overlap = Math.min(end, range.end) - Math.max(start, range.start)
    if (overlap > 0) total += overlap
  }
  return total
}

function triangularPeak(duration, low, peak, high) {
  if (duration <= low || duration >= high) return 0
  if (duration <= peak) return (duration - low) / (peak - low)
  return 1 - (duration - peak) / (high - peak)
}

const PROFILES = ['viral-shorts', 'podcast-summary', 'cinematic-vlog']

function scoreForProfile(scene, silenceRatio, speechRatio, profile) {
  const duration = scene.end - scene.start
  if (profile === 'podcast-summary') {
    // Keep speech, cut silence: score follows the speech ratio.
    if (silenceRatio >= 0.9) return { score: 0.05, reason: 'silence' }
    return { score: clamp01(0.15 + speechRatio * 0.85), reason: speechRatio > 0.5 ? 'speech' : 'filler' }
  }
  if (profile === 'cinematic-vlog') {
    // Prefer stable 4-20s shots; mild silence penalty.
    const stability = triangularPeak(duration, 2, 8, 25)
    const score = clamp01(0.2 + stability * 0.7) * (1 - silenceRatio * 0.5)
    if (silenceRatio >= 0.9) return { score: 0.05, reason: 'silence' }
    return { score, reason: stability > 0.5 ? 'stable-shot' : 'cutaway' }
  }
  // viral-shorts default: punchy 3-10s shots with speech.
  const punch = triangularPeak(duration, 1.5, 5, 12)
  const score = clamp01(0.1 + punch * 0.75 + speechRatio * 0.15) * (1 - silenceRatio * 0.8)
  if (silenceRatio >= 0.9) return { score: 0.05, reason: 'silence' }
  if (duration > 20) return { score: clamp01(score * 0.5), reason: 'too-long' }
  return { score, reason: speechRatio > 0.4 ? 'speech' : punch > 0.5 ? 'action' : 'filler' }
}

/**
 * Score scenes into an Edit Decision List (docs section 38).
 * speech: optional [{ start, end }] ranges (verbose transcript); the
 * scorer degrades gracefully without it.
 */
export function scoreSegments(input) {
  const scenes = Array.isArray(input?.scenes) ? input.scenes : []
  const silences = Array.isArray(input?.silences) ? input.silences : []
  const speech = Array.isArray(input?.speech) ? input.speech : []
  const profile = PROFILES.includes(input?.profile) ? input.profile : 'viral-shorts'
  const assetId = typeof input?.assetId === 'string' ? input.assetId : ''
  const segments = scenes.map((scene) => {
    const duration = Math.max(0, scene.end - scene.start)
    const silenceRatio = duration > 0 ? clamp01(overlapDuration(scene.start, scene.end, silences) / duration) : 1
    const speechRatio = duration > 0 ? clamp01(overlapDuration(scene.start, scene.end, speech) / duration) : 0
    const { score, reason } = scoreForProfile(scene, silenceRatio, speechRatio, profile)
    return {
      start: round3(scene.start),
      end: round3(scene.end),
      score: Math.round(score * 1000) / 1000,
      reason,
      thumb: round3(scene.start + duration / 2)
    }
  }).filter(segment => segment.end > segment.start)
  return {
    version: 1,
    assetId,
    profile,
    segments,
    createdAt: new Date().toISOString(),
    analyzerVersion: input?.analyzerVersion || 'scene-1'
  }
}
