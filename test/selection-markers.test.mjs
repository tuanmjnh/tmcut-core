// @tmcut/core — selection + markers tests. Run: node --test "test/*.test.mjs"
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createSelection,
  toggleSelected,
  selectAllClips,
  selectTrackClips,
  expandRelated,
  resolveClips
} from '../src/selection.mjs'
import { addMarker, removeMarker, moveMarker, markersInRange } from '../src/markers.mjs'
import { addClip } from '../src/timeline.mjs'
import { secToTicks } from '../src/time.mjs'
import { defaultTimeline } from '../src/project.mjs'

describe('selection', () => {
  it('builds ordered unique selections', () => {
    assert.deepEqual(createSelection(['b', 'a', 'b', '', 42]), ['b', 'a'])
    assert.deepEqual(toggleSelected(['a'], 'b'), ['a', 'b'])
    assert.deepEqual(toggleSelected(['a', 'b'], 'a'), ['b'])
  })

  it('selects clips per track and globally', () => {
    const timeline = defaultTimeline()
    const first = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(2) } })
    const second = addClip(timeline, 'audio', { source: { in: 0, out: secToTicks(2) } })
    assert.deepEqual(selectAllClips(timeline).sort(), [first.id, second.id].sort())
    const videoTrack = timeline.tracks.find(t => t.type === 'video')
    assert.deepEqual(selectTrackClips(timeline, videoTrack.id), [first.id])
    assert.deepEqual(selectTrackClips(timeline, 'missing'), [])
  })

  it('expands group and link relations', () => {
    const timeline = defaultTimeline()
    const solo = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(2) } })
    const grouped = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(2) }, groupId: 'g1' })
    const mate = addClip(timeline, 'audio', { source: { in: 0, out: secToTicks(2) }, groupId: 'g1' })
    const linked = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(2) }, linkId: 'l1' })
    const pair = addClip(timeline, 'audio', { source: { in: 0, out: secToTicks(2) }, linkId: 'l1' })
    assert.deepEqual(expandRelated(timeline, [solo.id]), [solo.id])
    assert.deepEqual(expandRelated(timeline, [grouped.id]).sort(), [grouped.id, mate.id].sort())
    assert.deepEqual(expandRelated(timeline, [linked.id]).sort(), [linked.id, pair.id].sort())
    assert.equal(expandRelated(timeline, []).length, 0)
  })

  it('resolves ids to clip entries', () => {
    const timeline = defaultTimeline()
    const clip = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(2) } })
    const resolved = resolveClips(timeline, [clip.id, 'ghost'])
    assert.equal(resolved.length, 1)
    assert.equal(resolved[0].clip.id, clip.id)
  })
})

describe('markers', () => {
  it('adds, moves, queries and removes markers', () => {
    const timeline = defaultTimeline()
    const second = addMarker(timeline, secToTicks(10), { label: 'B' })
    const first = addMarker(timeline, secToTicks(2), { label: 'A' })
    assert.ok(first.at < second.at)
    assert.equal(timeline.markers[0].id, first.id)
    assert.equal(moveMarker(timeline, first.id, secToTicks(12)), true)
    assert.equal(timeline.markers[1].id, first.id)
    assert.deepEqual(markersInRange(timeline, secToTicks(9), secToTicks(13)).map(m => m.id).sort(), [first.id, second.id].sort())
    assert.equal(moveMarker(timeline, 'ghost', 0), false)
    assert.equal(removeMarker(timeline, first.id), true)
    assert.equal(removeMarker(timeline, first.id), false)
    assert.equal(timeline.markers.length, 1)
  })
})
