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
    effects: Array.isArray(item.effects) ? item.effects : [],
    keyframes: Array.isArray(item.keyframes) ? item.keyframes : [],
    transitionIn: item.transitionIn
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
    groupId: clip.groupId ?? null,
    linkId: clip.linkId ?? null
  }
  return patch
}

const COMPARE_NUMBERS = ['in', 'out', 'offset', 'speed', 'opacity', 'scale', 'x', 'y', 'rotation', 'volume', 'fontSize', 'focusX', 'focusY']
const COMPARE_STRINGS = ['name', 'src', 'text', 'color', 'fit']

function sameValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= EPS
  return a === b
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
  return true
}

/**
 * Merge a mutated v3 timeline back into v1 tracks (matched by id).
 * Untouched clips are NOT rewritten (epsilon compare); new ids are
 * appended (creating v1 tracks when the v3 track is unknown); ids absent
 * from v3 are removed. Returns { added, updated, removed }.
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
  return stats
}
