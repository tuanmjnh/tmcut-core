// =============================================================================
//  @tmcut/core — v1compat
//  Transitional bridge between the app v1 timeline shape (float seconds,
//  numeric opacity/scale, path srcs) and the DSL v3 engine (integer ticks,
//  rational transforms, assetId+locator). Structural typing only — no app
//  imports, so the core stays dependency-free. DELETE after the app state
//  migrates to v3 natively.
// =============================================================================

import { secToTicks, ticksToSec } from './time.mjs'

const EPS = 1e-6

function round4(value) {
  return Math.round(value * 10000) / 10000
}

function num(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** v1 clip -> v3 clip (structural, any object with v1 fields). */
export function v1ClipToV3(item, trackType) {
  const speed = num(item.speed, 1) > 0 ? num(item.speed, 1) : 1
  const sourceIn = Math.max(0, Math.round(secToTicks(num(item.in))))
  const sourceOut = Math.max(sourceIn + 1, Math.round(secToTicks(item.out ?? 5)))
  const scale = num(item.scale, 100) / 100
  const opacity = num(item.opacity, 100)
  return {
    id: item.id,
    type: trackType,
    name: item.name ?? item.text ?? 'Clip',
    assetId: null,
    locator: item.src ? { runtime: 'electron', path: item.src } : null,
    source: { in: sourceIn, out: sourceOut },
    timeline: {
      start: Math.max(0, Math.round(secToTicks(num(item.offset)))),
      duration: Math.max(1, Math.round((sourceOut - sourceIn) / speed))
    },
    speed,
    reverse: item.reverse ?? false,
    groupId: item.groupId ?? null,
    linkId: item.linkId ?? null,
    transform: {
      x: num(item.x),
      y: num(item.y),
      scaleX: scale,
      scaleY: scale,
      rotation: num(item.rotation),
      opacity: Math.min(1, Math.max(0, opacity > 1 ? opacity / 100 : opacity))
    },
    fit: item.fit,
    focusX: item.focusX,
    focusY: item.focusY,
    cropRect: item.cropRect,
    volume: item.volume,
    text: item.text,
    color: item.color,
    fontSize: item.fontSize,
    fontFamily: item.fontFamily,
    fontFile: item.fontFile,
    bold: item.bold,
    italic: item.italic,
    align: item.align,
    shadow: item.shadow,
    stroke: item.stroke,
    effects: Array.isArray(item.effects) ? item.effects : [],
    keyframes: Array.isArray(item.keyframes) ? item.keyframes : [],
    transitionIn: item.transitionIn,
    fade: item.fade,
    animIn: item.animIn,
    animInDuration: item.animInDuration,
    animOut: item.animOut,
    animOutDuration: item.animOutDuration,
    stabilize: item.stabilize,
    stabilizeLevel: item.stabilizeLevel,
    stabilizedPath: item.stabilizedPath,
    stabilizeStatus: item.stabilizeStatus
  }
}

/** v1 track list -> v3 timeline (tracks keep their ids for merge-back). */
export function v1TracksToV3(tracks) {
  return {
    version: 3,
    tracks: (tracks ?? []).map(track => ({
      id: track.id,
      type: track.type,
      name: track.name,
      muted: track.muted,
      locked: track.locked,
      hidden: track.hidden,
      items: (track.items ?? []).map(item => v1ClipToV3(item, track.type))
    })),
    markers: []
  }
}

/** v3 clip -> v1 field patch (floats rounded to 4 decimals, ulp-noise free). */
export function v3ClipToV1(clip) {
  const patch = {
    id: clip.id,
    name: clip.name,
    src: clip.locator?.path,
    text: clip.text,
    color: clip.color,
    fontSize: clip.fontSize,
    fontFamily: clip.fontFamily,
    fontFile: clip.fontFile,
    bold: clip.bold,
    italic: clip.italic,
    align: clip.align,
    shadow: clip.shadow,
    stroke: clip.stroke,
    in: round4(ticksToSec(clip.source.in)),
    out: round4(ticksToSec(clip.source.out)),
    offset: round4(ticksToSec(clip.timeline.start)),
    speed: clip.speed,
    reverse: clip.reverse ?? false,
    opacity: round4(clip.transform.opacity * 100),
    scale: round4(((clip.transform.scaleX + clip.transform.scaleY) / 2) * 100),
    x: round4(clip.transform.x),
    y: round4(clip.transform.y),
    rotation: clip.transform.rotation,
    volume: clip.volume,
    fit: clip.fit,
    focusX: clip.focusX,
    focusY: clip.focusY,
    cropRect: clip.cropRect,
    effects: clip.effects ?? [],
    keyframes: clip.keyframes ?? [],
    transitionIn: clip.transitionIn,
    fade: clip.fade,
    animIn: clip.animIn,
    animInDuration: clip.animInDuration,
    animOut: clip.animOut,
    animOutDuration: clip.animOutDuration,
    stabilize: clip.stabilize,
    stabilizeLevel: clip.stabilizeLevel,
    stabilizedPath: clip.stabilizedPath,
    stabilizeStatus: clip.stabilizeStatus,
    groupId: clip.groupId ?? null,
    linkId: clip.linkId ?? null
  }
  return patch
}

const COMPARE_NUMBERS = ['in', 'out', 'offset', 'speed', 'opacity', 'scale', 'x', 'y', 'rotation', 'volume', 'fontSize', 'focusX', 'focusY', 'animInDuration', 'animOutDuration']
// groupId/linkId must be compared or relation-only core edits (C9
// grouping) get silently dropped by syncV3Result.
// fontFamily/fontFile (C-1) must be compared so a font-only edit syncs
// back AND split/paste/duplicate clones (which copy the v3 clip verbatim)
// keep the picked face on their new v1 items.
const COMPARE_STRINGS = ['name', 'src', 'text', 'color', 'fit', 'groupId', 'linkId', 'fontFamily', 'fontFile', 'align', 'animIn', 'animOut', 'stabilizeLevel', 'stabilizedPath', 'stabilizeStatus']
// Text style flags (C-2): undefined and false compare EQUAL — v1 items
// from older projects lack the keys, so a strict compare would rewrite
// every untouched clip on open. `reverse` is here too: v1 items often
// lack it (undefined) while v3 normalizes to false, so treat undefined
// as false — a real reverse toggle must sync back (R74).
const COMPARE_FLAGS = ['bold', 'italic', 'shadow', 'stroke', 'stabilize', 'reverse']

// Deep-compare effect arrays so an effects-only edit syncs back (R74).
function sameEffects(a, b) {
  const arrA = Array.isArray(a) ? a : []
  const arrB = Array.isArray(b) ? b : []
  if (arrA.length !== arrB.length) return false
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i].type !== arrB[i].type) return false
    const pa = arrA[i].params || {}
    const pb = arrB[i].params || {}
    const keysA = Object.keys(pa).sort()
    const keysB = Object.keys(pb).sort()
    if (keysA.length !== keysB.length) return false
    for (const k of keysA) {
      if (!sameValue(pa[k], pb[k])) return false
    }
  }
  return true
}

// Deep-compare keyframe arrays so a keyframe-only edit syncs back (R74).
function sameKeyframes(a, b) {
  const arrA = Array.isArray(a) ? a : []
  const arrB = Array.isArray(b) ? b : []
  if (arrA.length !== arrB.length) return false
  for (let i = 0; i < arrA.length; i++) {
    if (!sameValue(arrA[i].t, arrB[i].t)) return false
    if (arrA[i].prop !== arrB[i].prop) return false
    if (!sameValue(arrA[i].value, arrB[i].value)) return false
  }
  return true
}

function sameValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= EPS
  return a === b
}

function sameTransition(a, b) {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  if (a.type !== b.type) return false
  return sameValue(num(a.duration, 0), num(b.duration, 0))
}

// fade is an object { in, out } (both TICKS): compared explicitly so
// CLEARING a fade syncs back (R38/C12), same reasoning as transitionIn.
function sameFade(a, b) {
  const aIn = num(a?.in, 0)
  const aOut = num(a?.out, 0)
  const bIn = num(b?.in, 0)
  const bOut = num(b?.out, 0)
  const aSet = aIn > 0 || aOut > 0
  const bSet = bIn > 0 || bOut > 0
  if (aSet !== bSet) return false
  if (!aSet) return true
  return sameValue(aIn, bIn) && sameValue(aOut, bOut)
}

function sameCropRect(a, b) {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return sameValue(num(a.x, 0), num(b.x, 0))
    && sameValue(num(a.y, 0), num(b.y, 0))
    && sameValue(num(a.w, 1), num(b.w, 1))
    && sameValue(num(a.h, 1), num(b.h, 1))
}

/** True when a v1 item already matches a v3 clip (untouched clips skip). */
export function v1MatchesV3(item, clip) {
  const patch = v3ClipToV1(clip)
  for (const key of COMPARE_NUMBERS) {
    if (!sameValue(num(item[key], 0), num(patch[key], 0))) return false
  }
  for (const key of COMPARE_STRINGS) {
    if ((item[key] ?? null) !== (patch[key] ?? null)) return false
  }
  for (const key of COMPARE_FLAGS) {
    if ((item[key] ?? false) !== (patch[key] ?? false)) return false
  }
  // transitionIn is an object { type, duration } (duration in TICKS):
  // compared explicitly so CLEARING a transition syncs back even when the
  // restored offset round-trips to the same value (R34/B3).
  if (!sameTransition(item.transitionIn, patch.transitionIn)) return false
  // fade { in, out } in TICKS: a fade the user clears must sync back
  // even when no numeric field changed (R38/C12).
  if (!sameFade(item.fade, patch.fade)) return false
  // cropRect { x, y, w, h }: compared explicitly so crop adjustments sync back (R67/F-3).
  if (!sameCropRect(item.cropRect, patch.cropRect)) return false
  // effects[]: deep-compared so an effects-only edit syncs back (R74).
  if (!sameEffects(item.effects, patch.effects)) return false
  // keyframes[]: deep-compared so a keyframe-only edit syncs back (R74).
  if (!sameKeyframes(item.keyframes, patch.keyframes)) return false
  return true
}

/**
 * Merge a mutated v3 timeline back into v1 tracks (matched by id).
 * Untouched clips are NOT rewritten (epsilon compare); new ids are
 * appended (creating v1 tracks when the v3 track is unknown); ids absent
 * from v3 are removed, and so are v1 tracks whose id no longer exists in
 * v3 (track add/remove flows through here). Returns
 * { added, updated, removed } for clips.
 */
export function syncV3Result(v1Tracks, afterV3) {
  const stats = { added: 0, updated: 0, removed: 0 }
  const v1ById = new Map()
  for (const track of v1Tracks ?? []) {
    for (let index = 0; index < (track.items ?? []).length; index += 1) {
      v1ById.set(track.items[index].id, { track, index })
    }
  }
  const v3Ids = new Set()
  for (const v3Track of afterV3?.tracks ?? []) {
    let v1Track = (v1Tracks ?? []).find(track => track.id === v3Track.id)
    if (!v1Track) {
      v1Track = { id: v3Track.id, type: v3Track.type, name: v3Track.name ?? v3Track.type, items: [] }
      v1Tracks.push(v1Track)
    }
    // Sync track-level flags (muted/locked/hidden) from v3 so a track
    // toggle survives the live round-trip (R74). v1 items often lack
    // these keys, so treat undefined as false.
    const trackPatch = {}
    if (v3Track.muted !== undefined) trackPatch.muted = !!v3Track.muted
    if (v3Track.locked !== undefined) trackPatch.locked = !!v3Track.locked
    if (v3Track.hidden !== undefined) trackPatch.hidden = !!v3Track.hidden
    if (Object.keys(trackPatch).length > 0) {
      Object.assign(v1Track, trackPatch)
    }
    for (const clip of v3Track.items ?? []) {
      v3Ids.add(clip.id)
      const location = v1ById.get(clip.id)
      if (!location) {
        v1Track.items.push(v3ClipToV1(clip))
        stats.added += 1
      } else if (!v1MatchesV3(location.track.items[location.index], clip)) {
        Object.assign(location.track.items[location.index], v3ClipToV1(clip))
        stats.updated += 1
      }
    }
  }
  for (const track of v1Tracks ?? []) {
    for (let index = (track.items ?? []).length - 1; index >= 0; index -= 1) {
      if (!v3Ids.has(track.items[index].id)) {
        track.items.splice(index, 1)
        stats.removed += 1
      }
    }
  }
  const v3TrackIds = new Set((afterV3?.tracks ?? []).map(track => track.id))
  for (let index = (v1Tracks ?? []).length - 1; index >= 0; index -= 1) {
    if (!v3TrackIds.has(v1Tracks[index].id)) v1Tracks.splice(index, 1)
  }
  return stats
}
