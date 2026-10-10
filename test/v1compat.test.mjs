// @tmcut/core — v1compat tests. Run: node --test "test/*.test.mjs"
// v1 fixtures mirror the app TmcutTimelineItem shape structurally
// (no app imports — the core stays dependency-free).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { v1ClipToV3, v1TracksToV3, v1MatchesV3, syncV3Result } from '../src/v1compat.mjs'
import { duplicateClips, rippleDelete } from '../src/editing.mjs'
import { secToTicks } from '../src/time.mjs'

function v1Clip(partial = {}) {
  return {
    id: 'clip_1',
    name: 'a.mp4',
    src: 'D:/Videos/a.mp4',
    in: 2,
    out: 12,
    offset: 0,
    speed: 1,
    opacity: 80,
    scale: 100,
    x: 10,
    y: 20,
    rotation: 0,
    volume: 100,
    effects: [],
    keyframes: [],
    ...partial
  }
}

function v1Tracks() {
  return [{ id: 't-video-1', type: 'video', name: 'Video 1', items: [v1Clip()] }]
}

describe('v1compat', () => {
  it('converts v1 clips to v3 ticks losslessly', () => {
    const v3 = v1ClipToV3(v1Clip(), 'video')
    assert.equal(v3.source.in, secToTicks(2))
    assert.equal(v3.source.out, secToTicks(12))
    assert.equal(v3.timeline.start, 0)
    assert.equal(v3.transform.opacity, 0.8)
    assert.deepEqual(v3.locator, { runtime: 'electron', path: 'D:/Videos/a.mp4' })
  })

  it('round-trips untouched clips without rewrites', () => {
    const tracks = v1Tracks()
    const v3 = v1TracksToV3(tracks)
    assert.ok(v1MatchesV3(tracks[0].items[0], v3.tracks[0].items[0]))
    const stats = syncV3Result(tracks, v3)
    assert.deepEqual(stats, { added: 0, updated: 0, removed: 0 })
    assert.equal(tracks[0].items[0].in, 2)
  })

  it('detects relation-only changes (groupId/linkId)', () => {
    const tracks = v1Tracks()
    const v3 = v1TracksToV3(tracks)
    // Group/link-only mutations must not be mistaken for "untouched" —
    // syncV3Result would silently drop them (C9).
    v3.tracks[0].items[0].groupId = 'grp_new'
    assert.equal(v1MatchesV3(tracks[0].items[0], v3.tracks[0].items[0]), false)
    const stats = syncV3Result(tracks, v3)
    assert.deepEqual(stats, { added: 0, updated: 1, removed: 0 })
    assert.equal(tracks[0].items[0].groupId, 'grp_new')
  })

  it('detects transition-only changes (transitionIn)', () => {
    const tracks = v1Tracks()
    tracks[0].items[0].transitionIn = { type: 'fade', duration: secToTicks(0.5) }
    const clip = v1TracksToV3(tracks).tracks[0].items[0]
    assert.ok(v1MatchesV3(tracks[0].items[0], clip))
    // Clearing must be detected even though the restored offset
    // round-trips equal — otherwise syncV3Result keeps the stale
    // transition forever (R34/B3).
    const cleared = { ...clip }
    delete cleared.transitionIn
    assert.equal(v1MatchesV3(tracks[0].items[0], cleared), false)
    const retyped = { ...clip, transitionIn: { type: 'wipe-left', duration: secToTicks(0.5) } }
    assert.equal(v1MatchesV3(tracks[0].items[0], retyped), false)
  })

  it('detects fade-only changes (fade envelope)', () => {
    const tracks = v1Tracks()
    tracks[0].items[0].fade = { in: secToTicks(0.5), out: 0 }
    const clip = v1TracksToV3(tracks).tracks[0].items[0]
    assert.ok(v1MatchesV3(tracks[0].items[0], clip))
    // Clearing must sync back even though no numeric field changed,
    // otherwise syncV3Result keeps the stale fade forever (R38/C12).
    const cleared = { ...clip }
    delete cleared.fade
    assert.equal(v1MatchesV3(tracks[0].items[0], cleared), false)
    const resized = { ...clip, fade: { in: secToTicks(1), out: 0 } }
    assert.equal(v1MatchesV3(tracks[0].items[0], resized), false)
  })

  it('merges core op results back by id', () => {
    const tracks = v1Tracks()
    const v3 = v1TracksToV3(tracks)
    const copies = duplicateClips(v3, ['clip_1'], secToTicks(20))
    assert.equal(copies.length, 1)
    const stats = syncV3Result(tracks, v3)
    assert.deepEqual(stats, { added: 1, updated: 0, removed: 0 })
    assert.equal(tracks[0].items.length, 2)
    assert.equal(tracks[0].items[1].offset, 20)
  })

  it('applies ripple removals back to v1', () => {
    const tracks = [{ id: 't-video-1', type: 'video', name: 'V', items: [v1Clip({ id: 'a', offset: 0 }), v1Clip({ id: 'b', offset: 10, src: 'D:/b.mp4', name: 'b.mp4' })] }]
    const v3 = v1TracksToV3(tracks)
    assert.equal(rippleDelete(v3, 'a'), 1)
    const stats = syncV3Result(tracks, v3)
    assert.deepEqual(stats, { added: 0, updated: 1, removed: 1 })
    assert.equal(tracks[0].items.length, 1)
    assert.equal(tracks[0].items[0].id, 'b')
    assert.equal(tracks[0].items[0].offset, 0)
  })

  it('syncs track add/remove at the track level', () => {
    const tracks = [
      { id: 't-video-1', type: 'video', name: 'Video 1', items: [v1Clip()] },
      { id: 't-audio-1', type: 'audio', name: 'Audio 1', items: [] }
    ]
    const v3 = v1TracksToV3(tracks)

    // A v3-only track is created back as a v1 track...
    v3.tracks.push({ id: 't-video-2', type: 'video', name: 'Video 2', items: [] })
    syncV3Result(tracks, v3)
    assert.equal(tracks.length, 3)
    assert.equal(tracks[2].id, 't-video-2')
    assert.equal(tracks[2].name, 'Video 2')

    // ...and a v1 track missing from v3 is dropped with its clips.
    v3.tracks = v3.tracks.filter(track => track.id !== 't-video-1')
    const stats = syncV3Result(tracks, v3)
    assert.equal(stats.removed, 1)
    assert.deepEqual(tracks.map(track => track.id), ['t-audio-1', 't-video-2'])
  })
})
