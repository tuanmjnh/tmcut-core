// =============================================================================
//  @tmcut/core — editing
//  Multi-clip edit operations (docs Phase 2): set moves, duplicates,
//  clipboard copy/paste, ripple delete and magnetic snapping. All pure and
//  lock-aware: clips on locked tracks are skipped, never mutated.
// =============================================================================

import { TICKS_PER_SECOND } from './time.mjs'
import { clipDurationTicks, clipEndTicks, ensureTrack, findClip } from './timeline.mjs'
import { createSelection, expandRelated } from './selection.mjs'

let editCounter = 0

function nextEditId(prefix) {
  editCounter += 1
  return `${prefix}_${Date.now().toString(36)}${editCounter.toString(36)}`
}

function isLockedTrack(track) {
  return !!track?.locked
}

/**
 * Move a set of clips by a tick delta. Related (group/link) members join
 * automatically. Returns { moved, skippedLocked }.
 */
export function moveClips(timeline, ids, deltaTicks) {
  const expanded = expandRelated(timeline, ids)
  let moved = 0
  let skippedLocked = 0
  for (const id of expanded) {
    const found = findClip(timeline, id)
    if (!found) continue
    if (isLockedTrack(found.track)) {
      skippedLocked += 1
      continue
    }
    found.clip.timeline.start = Math.max(0, Math.round(found.clip.timeline.start + deltaTicks))
    moved += 1
  }
  return { moved, skippedLocked }
}

/**
 * Duplicate clips. Copies share one fresh groupId when the sources shared
 * one; linkIds are dropped so copies never stay linked to originals.
 * When `atTicks` is given, the block keeps relative offsets from it.
 * Returns the new clips.
 */
export function duplicateClips(timeline, ids, atTicks) {
  const expanded = expandRelated(timeline, ids)
  const resolved = []
  for (const id of expanded) {
    const found = findClip(timeline, id)
    if (found && !isLockedTrack(found.track)) resolved.push(found)
  }
  if (resolved.length === 0) return []
  const base = Math.min(...resolved.map(entry => entry.clip.timeline.start))
  const target = Number.isFinite(atTicks) ? Math.max(0, Math.round(atTicks)) : base
  const groupRemap = new Map()
  const freshGroup = () => {
    const id = nextEditId('group')
    return id
  }
  const copies = []
  for (const entry of resolved) {
    const source = entry.clip
    let groupId = null
    if (source.groupId) {
      if (!groupRemap.has(source.groupId)) groupRemap.set(source.groupId, freshGroup())
      groupId = groupRemap.get(source.groupId)
    }
    const copy = JSON.parse(JSON.stringify(source))
    copy.id = nextEditId('clip')
    copy.groupId = groupId
    copy.linkId = null
    copy.timeline = {
      start: target + (source.timeline.start - base),
      duration: source.timeline.duration
    }
    entry.track.items.push(copy)
    copies.push(copy)
  }
  return copies
}

/**
 * Serialize clips into a portable clipboard payload (copy/paste, and later
 * cross-project paste). Plain JSON — no functions, no handles.
 */
export function copyClips(timeline, ids) {
  const expanded = expandRelated(timeline, ids)
  const clips = []
  for (const id of expanded) {
    const found = findClip(timeline, id)
    if (found) {
      clips.push({
        trackType: found.track.type,
        clip: JSON.parse(JSON.stringify(found.clip))
      })
    }
  }
  if (clips.length === 0) return null
  const baseStart = Math.min(...clips.map(entry => entry.clip.timeline.start))
  return { version: 1, baseStart, clips }
}

/**
 * Paste a clipboard payload at a tick position, preserving relative
 * offsets and resolving track types (creating tracks as needed).
 * Returns the new clip ids.
 */
export function pasteClips(timeline, clipboard, atTicks) {
  if (!clipboard || clipboard.version !== 1 || !Array.isArray(clipboard.clips)) return []
  const target = Math.max(0, Math.round(atTicks))
  const base = Number.isFinite(clipboard.baseStart) ? clipboard.baseStart : 0
  const groupRemap = new Map()
  const ids = []
  for (const entry of clipboard.clips) {
    if (!entry || !entry.clip) continue
    const track = ensureTrack(timeline, entry.trackType ?? 'video')
    if (isLockedTrack(track)) continue
    const source = entry.clip
    let groupId = null
    if (source.groupId) {
      if (!groupRemap.has(source.groupId)) groupRemap.set(source.groupId, nextEditId('group'))
      groupId = groupRemap.get(source.groupId)
    }
    const clip = JSON.parse(JSON.stringify(source))
    clip.id = nextEditId('clip')
    clip.groupId = groupId
    clip.linkId = null
    clip.timeline = {
      start: target + (source.timeline.start - base),
      duration: source.timeline.duration
    }
    track.items.push(clip)
    ids.push(clip.id)
  }
  return ids
}

/**
 * Ripple delete: remove the clip, then shift every later clip on the same
 * track left by the removed duration. With `acrossTracks`, all tracks
 * shift. Locked tracks never shift. Returns shifted count, or null when
 * the clip is missing or locked.
 */
export function rippleDelete(timeline, clipId, options = {}) {
  const found = findClip(timeline, clipId)
  if (!found || isLockedTrack(found.track)) return null
  const gap = clipDurationTicks(found.clip)
  const cutStart = found.clip.timeline.start
  found.track.items.splice(found.index, 1)
  const tracks = options.acrossTracks
    ? timeline.tracks.filter(track => !isLockedTrack(track))
    : [found.track]
  let shifted = 0
  for (const track of tracks) {
    for (const item of track.items ?? []) {
      if (item.timeline.start >= cutStart + gap) {
        item.timeline.start = Math.max(0, item.timeline.start - gap)
        shifted += 1
      }
    }
  }
  return shifted
}

/**
 * Magnetic snapping (docs Phase 2): snap a tick position to the nearest
 * candidate (0, playhead, clip starts/ends, marker positions) within
 * `thresholdTicks` (default 0.08s). `ignoreIds` excludes clips being
 * dragged so they never snap to themselves.
 */
export function snapTime(timeline, targetTicks, options = {}) {
  const threshold = Number.isFinite(options.thresholdTicks)
    ? Math.max(0, options.thresholdTicks)
    : Math.round(TICKS_PER_SECOND * 0.08)
  const ignored = new Set(createSelection(options.ignoreIds))
  const candidates = [0]
  if (Number.isFinite(options.playheadTicks) && options.playheadTicks >= 0) {
    candidates.push(Math.round(options.playheadTicks))
  }
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      if (!item || ignored.has(item.id)) continue
      candidates.push(item.timeline.start, clipEndTicks(item))
    }
  }
  for (const marker of timeline?.markers ?? []) {
    if (Number.isFinite(marker.at)) candidates.push(marker.at)
  }
  let best = Math.max(0, Math.round(targetTicks))
  let bestDist = threshold + 1
  for (const candidate of candidates) {
    const dist = Math.abs(candidate - targetTicks)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  return bestDist <= threshold ? best : Math.max(0, Math.round(targetTicks))
}
