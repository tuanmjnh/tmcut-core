// @tmcut/core — analysis tests. Run: node --test "test/*.test.mjs"
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseSceneOutput, parseSilenceOutput, overlapDuration, scoreSegments } from '../src/analysis.mjs'

const SHOWINFO = `
[Parsed_showinfo_1 @ 0x123] n:  10 pts:  240 pts_time:2.000 s:1920x1080 fmt:yuv420p
[Parsed_showinfo_1 @ 0x123] n:  25 pts:  600 pts_time:5.000 s:1920x1080 fmt:yuv420p
[Parsed_showinfo_1 @ 0x123] n:  40 pts:  960 pts_time:8.000 s:1920x1080 fmt:yuv420p
`

const SILENCE = `
[silencedetect @ 0xabc] silence_start: 1.000
[silencedetect @ 0xabc] silence_end: 3.000 | silence_duration: 2.000
[silencedetect @ 0xabc] silence_start: 9.500
`

describe('analysis', () => {
  it('parses showinfo cuts into shot segments', () => {
    const segments = parseSceneOutput(SHOWINFO, 10)
    assert.deepEqual(segments, [
      { start: 0, end: 2 },
      { start: 2, end: 5 },
      { start: 5, end: 8 },
      { start: 8, end: 10 }
    ])
  })

  it('handles empty scene output', () => {
    assert.deepEqual(parseSceneOutput('', 0), [])
    assert.deepEqual(parseSceneOutput('no cuts here', 6), [{ start: 0, end: 6 }])
  })

  it('parses silencedetect ranges and closes dangling starts', () => {
    assert.deepEqual(parseSilenceOutput(SILENCE, 12), [
      { start: 1, end: 3 },
      { start: 9.5, end: 12 }
    ])
    assert.deepEqual(parseSilenceOutput('', 5), [])
  })

  it('measures range overlap', () => {
    assert.equal(overlapDuration(0, 10, [{ start: 2, end: 5 }]), 3)
    assert.equal(overlapDuration(0, 10, []), 0)
    assert.equal(overlapDuration(4, 6, [{ start: 0, end: 10 }]), 2)
  })

  it('scores viral-shorts EDL with speech boosts', () => {
    const edl = scoreSegments({
      assetId: 'a1',
      profile: 'viral-shorts',
      scenes: [{ start: 0, end: 5 }, { start: 5, end: 30 }, { start: 30, end: 31 }],
      silences: [],
      speech: [{ start: 0, end: 5 }]
    })
    assert.equal(edl.version, 1)
    assert.equal(edl.profile, 'viral-shorts')
    assert.equal(edl.segments.length, 3)
    assert.ok(edl.segments[0].score > edl.segments[2].score)
    assert.equal(edl.segments[1].reason, 'too-long')
    assert.ok(edl.segments.every(s => s.score >= 0 && s.score <= 1))
  })

  it('penalizes silence for podcasts', () => {
    const edl = scoreSegments({
      assetId: 'a1',
      profile: 'podcast-summary',
      scenes: [{ start: 0, end: 10 }],
      silences: [{ start: 0, end: 9.5 }],
      speech: []
    })
    assert.equal(edl.segments[0].reason, 'silence')
    assert.ok(edl.segments[0].score < 0.1)
  })

  it('prefers stable shots for vlogs and degrades without speech', () => {
    const edl = scoreSegments({
      assetId: 'a1',
      profile: 'cinematic-vlog',
      scenes: [{ start: 0, end: 8 }, { start: 8, end: 8.5 }]
    })
    assert.equal(edl.segments[0].reason, 'stable-shot')
    assert.ok(edl.segments[0].score > edl.segments[1].score)
  })

  it('falls back to viral-shorts on unknown profiles', () => {
    const edl = scoreSegments({ assetId: 'a1', profile: 'nope', scenes: [{ start: 0, end: 5 }] })
    assert.equal(edl.profile, 'viral-shorts')
  })
})
