// @tmcut/core — retime: speed/reverse time map (Roadmap C4).
//
// UNIT: every clip field (in/out) and every argument here is in timeline
// TICKS (TICKS_PER_SECOND = 120000) — the DSL v3 unit. App code that
// stores seconds converts at its boundary (sec * TICKS_PER_SECOND).
//
// Timeline model (clip-local): `t = 0` is the clip's own start on the
// timeline, its duration is (out - in) / speed and the source range
// [in, out] is the part of the media being used:
//
//   forward: source = in + t * speed      (speed > 1 plays more source
//                                          per timeline tick = faster)
//   reverse: source = out - t * speed     (plays the source backwards
//                                          from its end)
//
// Mapping functions clamp: timeline input to [0, duration], source
// output to [in, out] — callers can query outside ranges safely.
// Returned ticks may be fractional (round at the edge when integer
// ticks are required); roundtrips are exact within ±1 tick.

import { TICKS_PER_SECOND } from './time.mjs'

/** Smallest source span after a speed change — matches the editor's
 * minimum trim (0.2 s) so a clip never collapses to zero length. */
const MIN_SPAN_TICKS = TICKS_PER_SECOND / 5

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

function finiteOr(v, fallback) {
  return Number.isFinite(v) ? v : fallback
}

/**
 * Normalized speed: non-finite input (undefined/NaN) means "normal
 * speed" (1); anything below the floor clamps to 0.01 (100× slow-mo).
 * Negative speeds are invalid — `reverse` is a separate flag.
 * @param {number} speed
 * @returns {number}
 */
export function validateSpeed(speed) {
  const v = Number(speed)
  if (!Number.isFinite(v)) return 1
  return v < 0.01 ? 0.01 : v
}

/**
 * True when the clip needs retime filters in export (`speed !== 1` or
 * `reverse`) — the compiler's switch for setpts/asetpts/reverse steps.
 * @param {object|null|undefined} clip
 * @returns {boolean}
 */
export function isRetimed(clip) {
  if (!clip) return false
  return validateSpeed(clip.speed ?? 1) !== 1 || !!clip.reverse
}

/**
 * Timeline position (clip-local ticks) -> source ticks, honoring speed
 * and direction; clamped outside the clip to its source bounds.
 * @param {{ in?: number, out?: number, speed?: number, reverse?: boolean }} clip
 * @param {number} atTicks
 * @returns {number} source ticks within [in, out]
 */
export function timelineToSource(clip, atTicks) {
  const speed = validateSpeed(clip?.speed)
  const inT = finiteOr(clip?.in, 0)
  const outT = finiteOr(clip?.out, 0)
  const lo = Math.min(inT, outT)
  const hi = Math.max(inT, outT)
  const duration = Math.max(0, (outT - inT) / speed)
  const t = clamp(Number.isFinite(atTicks) ? atTicks : 0, 0, duration)
  const src = clip?.reverse ? outT - t * speed : inT + t * speed
  return clamp(src, lo, hi)
}

/**
 * Source ticks -> timeline position (clip-local ticks), the inverse of
 * timelineToSource; clamped outside the source range to [0, duration].
 * @param {{ in?: number, out?: number, speed?: number, reverse?: boolean }} clip
 * @param {number} sourceTicks
 * @returns {number} clip-local timeline ticks within [0, duration]
 */
export function sourceToTimeline(clip, sourceTicks) {
  const speed = validateSpeed(clip?.speed)
  const inT = finiteOr(clip?.in, 0)
  const outT = finiteOr(clip?.out, 0)
  const duration = Math.max(0, (outT - inT) / speed)
  const s = clamp(Number.isFinite(sourceTicks) ? sourceTicks : 0, Math.min(inT, outT), Math.max(inT, outT))
  const t = clip?.reverse ? (outT - s) / speed : (s - inT) / speed
  return clamp(t, 0, duration)
}

/**
 * Return a NEW clip with a different speed, keeping the source range
 * [in, out] untouched (CapCut behavior: source preserved, the timeline
 * duration (out - in) / speed changes) and never letting the span
 * collapse below the 0.2 s floor. `offset` (clip start) is unchanged.
 * Pure — wrap the resulting assignment with the app's applyV3Edit.
 * @param {{ in?: number, out?: number, speed?: number }} clip
 * @param {number} speed
 * @returns {object} normalized copy
 */
export function withSpeed(clip, speed) {
  const next = { ...(clip || {}), speed: validateSpeed(speed) }
  const inT = finiteOr(next.in, 0)
  if (!Number.isFinite(next.out) || next.out < inT + MIN_SPAN_TICKS) {
    next.out = inT + MIN_SPAN_TICKS
  }
  return next
}
