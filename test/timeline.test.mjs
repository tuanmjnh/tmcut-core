// @tmcut/core — timeline tests. Run: node --test test/
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  clipDurationTicks,
  clipEndTicks,
  totalDurationTicks,
  findClip,
  ensureTrack,
  addClip,
  removeClip,
  splitClip,
  moveClip,
  trimClip,
  validateTimeline
} from '../src/timeline.mjs'
import { secToTicks } from '../src/time.mjs'
import { defaultTimeline } from '../src/project.mjs'

function makeTimeline() {
  return defaultTimeline()
}

describe('timeline', () => {
  it('appends clips after the last clip end', () => {
    const timeline = makeTimeline()
    const first = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(10) } })
    const second = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(5) } })
    assert.equal(first.timeline.start, 0)
    assert.equal(second.timeline.start, secToTicks(10))
    assert.equal(totalDurationTicks(timeline), secToTicks(15))
  })

  it('adjusts media range by speed', () => {
    const timeline = makeTimeline()
    const clip = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(10) }, speed: 2 })
    assert.equal(clipDurationTicks(clip), secToTicks(5))
    assert.equal(clipEndTicks(clip), secToTicks(5))
  })

  it('finds and removes clips', () => {
    const timeline = makeTimeline()
    const clip = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(4) } })
    const found = findClip(timeline, clip.id)
    assert.equal(found.clip.id, clip.id)
    assert.equal(found.track.type, 'video')
    assert.equal(removeClip(timeline, clip.id), true)
    assert.equal(removeClip(timeline, clip.id), false)
    assert.equal(findClip(timeline, clip.id), null)
  })

  it('splits a clip into two exact pieces', () => {
    const timeline = makeTimeline()
    const clip = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(10) } })
    const second = splitClip(timeline, clip.id, secToTicks(4))
    assert.ok(second)
    assert.equal(clip.source.out, secToTicks(4))
    assert.equal(second.source.in, secToTicks(4))
    assert.equal(second.source.out, secToTicks(10))
    assert.equal(second.timeline.start, secToTicks(4))
    assert.equal(totalDurationTicks(timeline), secToTicks(10))
  })

  it('rejects out-of-range splits', () => {
    const timeline = makeTimeline()
    const clip = addClip(timeline, 'video', { source: { in: 0, out: secToTicks(10) } })
    assert.equal(splitClip(timeline, clip.id, 0), null)
    assert.equal(splitClip(timeline, clip.id, secToTicks(10)), null)
    assert.equal(splitClip(timeline, 'missing', secToTicks(5)), null)
  })

  it('moves and trims clips', () => {
    const timeline = makeTimeline()
    const clip = addClip(timeline, 'video', { source: { in: secToTicks(2), out: secToTicks(12) } })
    assert.equal(moveClip(timeline, clip.id, secToTicks(5)), true)
    assert.equal(clip.timeline.start, secToTicks(5))
    assert.equal(moveClip(timeline, clip.id, -100), true)
    assert.equal(clip.timeline.start, 0)
    assert.equal(trimClip(timeline, clip.id, 'out', secToTicks(6)), true)
    assert.equal(clip.source.out, secToTicks(6))
    assert.equal(trimClip(timeline, clip.id, 'in', secToTicks(3)), true)
    assert.equal(clip.source.in, secToTicks(3))
    assert.equal(clip.timeline.start, secToTicks(1))
    assert.equal(trimClip(timeline, clip.id, 'middle', 0), false)
  })

  it('creates missing tracks on demand', () => {
    const timeline = { version: 3, tracks: [], markers: [] }
    const track = ensureTrack(timeline, 'audio', 'Audio 1')
    assert.equal(track.type, 'audio')
    assert.equal(timeline.tracks.length, 1)
    assert.equal(ensureTrack(timeline, 'audio'), track)
  })

  it('validates timeline structure', () => {
    const timeline = makeTimeline()
    addClip(timeline, 'video', { source: { in: 0, out: secToTicks(3) } })
    assert.deepEqual(validateTimeline(timeline), [])
    assert.ok(validateTimeline(null).length > 0)
    assert.ok(validateTimeline({ version: 2, tracks: [] }).length > 0)
    const bad = makeTimeline()
    bad.tracks.push({ id: 't-x', type: 'hologram', items: [{ id: 'c1', source: { in: 5, out: 5 }, timeline: { start: -1, duration: 0 }, speed: 0 }] })
    assert.ok(validateTimeline(bad).length >= 4)
  })
})
