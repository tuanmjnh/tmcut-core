// @tmcut/core — editing + lock-guard tests. Run: node --test "test/*.test.mjs"
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  moveClips,
  duplicateClips,
  copyClips,
  pasteClips,
  rippleDelete,
  snapTime
} from '../src/editing.mjs'
import { addClip, removeClip, splitClip, moveClip, trimClip, totalDurationTicks } from '../src/timeline.mjs'
import { secToTicks, TICKS_PER_SECOND } from '../src/time.mjs'
import { defaultTimeline } from '../src/project.mjs'

function videoTimeline() {
  const timeline = defaultTimeline()
  const first = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(4) } })
  const second = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(4) } })
  return { timeline, first, second }
}

describe('lock guards', () => {
  it('refuses every mutation on locked tracks', () => {
    const { timeline, first } = videoTimeline()
    const track = timeline.tracks.find(t => t.type === 'video')
    track.locked = true
    assert.equal(addClip(timeline, 'video', { source: { in: 0, out: 10 } }), null)
    assert.equal(removeClip(timeline, first.id), false)
    assert.equal(splitClip(timeline, first.id, secToTicks(2)), null)
    assert.equal(moveClip(timeline, first.id, secToTicks(9)), false)
    assert.equal(trimClip(timeline, first.id, 'out', secToTicks(2)), false)
    assert.equal(first.timeline.start, 0)
  })
})

describe('editing', () => {
  it('moves clip sets with group expansion', () => {
    const { timeline, first, second } = videoTimeline()
    const result = moveClips(timeline, [first.id], secToTicks(2))
    assert.deepEqual(result, { moved: 1, skippedLocked: 0 })
    assert.equal(first.timeline.start, secToTicks(2))
    assert.equal(second.timeline.start, secToTicks(4))
  })

  it('skips locked members when moving sets', () => {
    const timeline = defaultTimeline()
    const free = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(2) }, groupId: 'g' })
    addClip(timeline, 'audio', { source: { in: 0, out: secToTicks(2) }, groupId: 'g' })
    const audioTrack = timeline.tracks.find(t => t.type === 'audio')
    audioTrack.locked = true
    const result = moveClips(timeline, [free.id], secToTicks(1))
    assert.equal(result.moved, 1)
    assert.equal(result.skippedLocked, 1)
  })

  it('duplicates clips with fresh ids and regrouped copies', () => {
    const timeline = defaultTimeline()
    const original = addClip(timeline, 'video', {
      source: { in: secToTicks(1), out: secToTicks(5) },
      groupId: 'g1',
      linkId: 'l1'
    })
    const copies = duplicateClips(timeline, [original.id], secToTicks(10))
    assert.equal(copies.length, 1)
    const copy = copies[0]
    assert.notEqual(copy.id, original.id)
    assert.equal(copy.linkId, null)
    assert.equal(copy.timeline.start, secToTicks(10))
    assert.equal(copy.source.in, original.source.in)
    assert.deepEqual(duplicateClips(timeline, ['ghost']), [])
  })

  it('copies and pastes preserving relative offsets', () => {
    const timeline = defaultTimeline()
    const first = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(2) } })
    const second = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(2) } })
    const clipboard = copyClips(timeline, [first.id, second.id])
    assert.ok(clipboard)
    assert.equal(copyClips(timeline, ['ghost']), null)
    const ids = pasteClips(timeline, clipboard, secToTicks(20))
    assert.equal(ids.length, 2)
    assert.equal(totalDurationTicks(timeline), secToTicks(24))
    assert.deepEqual(pasteClips(timeline, { version: 99 }, 0), [])
  })

  it('ripple-deletes and closes the gap', () => {
    const { timeline, first, second } = videoTimeline()
    const shifted = rippleDelete(timeline, first.id)
    assert.equal(shifted, 1)
    assert.equal(second.timeline.start, 0)
    assert.equal(totalDurationTicks(timeline), secToTicks(4))
    assert.equal(rippleDelete(timeline, 'ghost'), null)
  })

  it('leaves locked tracks untouched on cross-track ripple', () => {
    const timeline = defaultTimeline()
    const video = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(4) } })
    const following = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(4) } })
    const audio = addClip(timeline, 'audio', {
      source: { in: secToTicks(4), out: secToTicks(8) },
      offset: secToTicks(4)
    })
    const audioTrack = timeline.tracks.find(t => t.type === 'audio')
    audioTrack.locked = true
    const shifted = rippleDelete(timeline, video.id, { acrossTracks: true })
    assert.equal(shifted, 1)
    assert.equal(following.timeline.start, 0)
    assert.equal(audio.timeline.start, secToTicks(4))
  })

  it('snaps to playhead, edges and markers', () => {
    const { timeline, second } = videoTimeline()
    const near = second.timeline.start + Math.round(TICKS_PER_SECOND * 0.05)
    assert.equal(snapTime(timeline, near, {}), second.timeline.start)
    const far = second.timeline.start + TICKS_PER_SECOND
    assert.equal(snapTime(timeline, far, {}), far)
    assert.equal(snapTime(timeline, 50, { playheadTicks: 55 }), 55)
    assert.equal(snapTime(timeline, 50, { playheadTicks: 55, ignoreIds: [] }), 55)
    assert.equal(snapTime(timeline, -30, {}), 0)
  })
})
