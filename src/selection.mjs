// =============================================================================
//  @tmcut/core — selection
//  Pure multi-select model (docs Phase 2). Selections are plain id arrays;
//  expansion resolves group/link relations from the timeline so grouped or
//  linked clips always move, duplicate and delete together.
// =============================================================================

import { findClip } from './timeline.mjs'

/** Ordered unique id list. */
export function createSelection(ids = []) {
  const seen = new Set()
  const out = []
  for (const id of ids ?? []) {
    if (typeof id === 'string' && id.length > 0 && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

/** Toggle one id in a selection. Returns a new array. */
export function toggleSelected(selection, id) {
  const list = createSelection(selection)
  const index = list.indexOf(id)
  if (index === -1) list.push(id)
  else list.splice(index, 1)
  return list
}

/** Every clip id on the timeline. */
export function selectAllClips(timeline) {
  const ids = []
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      if (item.id) ids.push(item.id)
    }
  }
  return ids
}

/** Every clip id on one track. */
export function selectTrackClips(timeline, trackId) {
  const track = (timeline?.tracks ?? []).find(t => t.id === trackId)
  if (!track) return []
  return (track.items ?? []).map(item => item.id).filter(id => typeof id === 'string')
}

/**
 * Expand ids with group/link relatives: any clip sharing a groupId or
 * linkId with an already-selected clip joins the selection.
 */
export function expandRelated(timeline, ids) {
  const selected = new Set(createSelection(ids))
  if (selected.size === 0) return []
  const relations = new Set()
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      if (!item || !selected.has(item.id)) continue
      if (item.groupId) relations.add(`g:${item.groupId}`)
      if (item.linkId) relations.add(`l:${item.linkId}`)
    }
  }
  if (relations.size === 0) return [...selected]
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      if (!item || selected.has(item.id)) continue
      if (item.groupId && relations.has(`g:${item.groupId}`)) selected.add(item.id)
      else if (item.linkId && relations.has(`l:${item.linkId}`)) selected.add(item.id)
    }
  }
  return [...selected]
}

/** Resolve ids to { track, index, clip } entries, skipping unknowns. */
export function resolveClips(timeline, ids) {
  const out = []
  for (const id of createSelection(ids)) {
    const found = findClip(timeline, id)
    if (found) out.push(found)
  }
  return out
}
