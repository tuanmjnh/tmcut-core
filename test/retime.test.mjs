// @tmcut/core — retime tests. Run: node --test "test/*.test.mjs"
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateSpeed, isRetimed, timelineToSource, sourceToTimeline, withSpeed } from '../src/retime.mjs'
import { TICKS_PER_SECOND } from '../src/time.mjs'

const T = TICKS_PER_SECOND // 120000 ticks per second

// Timeline duration of a clip (what consumers derive from the fields).
const durationOf = clip => (clip.out - clip.in) / validateSpeed(clip.speed)

describe('retime', () => {
  it('validateSpeed clamps the floor and sanitizes bad input', () => {
    assert.equal(validateSpeed(2), 2)
    assert.equal(validateSpeed(0.5), 0.5)
    assert.equal(validateSpeed(0.005), 0.01) // below floor -> 0.01
    assert.equal(validateSpeed(-3), 0.01) // negative -> floor (reverse is a flag)
    assert.equal(validateSpeed(Number.NaN), 1) // invalid -> normal speed
    assert.equal(validateSpeed(undefined), 1)
  })

  it('isRetimed flags speed and reverse', () => {
    assert.equal(isRetimed({ speed: 1 }), false)
    assert.equal(isRetimed({ speed: 1, reverse: false }), false)
    assert.equal(isRetimed({}), false)
    assert.equal(isRetimed(null), false)
    assert.equal(isRetimed({ speed: 2 }), true)
    assert.equal(isRetimed({ speed: 1, reverse: true }), true)
    assert.equal(isRetimed({ speed: 0.5 }), true)
  })

  it('speed 2 halves the timeline duration, speed 0.5 doubles it', () => {
    const base = { in: T, out: 5 * T, speed: 1 } // 4s source span
    assert.equal(durationOf({ ...base, speed: 2 }), 2 * T)
    assert.equal(durationOf({ ...base, speed: 0.5 }), 8 * T)
  })

  it('maps timeline -> source forward (in + t * speed)', () => {
    const clip = { in: T, out: 5 * T, speed: 2 }
    assert.equal(timelineToSource(clip, 0), T)
    assert.equal(timelineToSource(clip, T), 3 * T)
    assert.equal(timelineToSource(clip, 2 * T), 5 * T) // end of source at clip end
    // Clamped outside the clip.
    assert.equal(timelineToSource(clip, 10 * T), 5 * T)
    assert.equal(timelineToSource(clip, -T), T)
  })

  it('maps timeline -> source reverse (out - t * speed): ends swap', () => {
    const clip = { in: T, out: 5 * T, speed: 2, reverse: true }
    assert.equal(durationOf(clip), 2 * T)
    assert.equal(timelineToSource(clip, 0), 5 * T) // starts at source end
    assert.equal(timelineToSource(clip, 2 * T), T) // ends at source start
  })

  it('roundtrips sourceToTimeline ∘ timelineToSource within ±1 tick', () => {
    for (const speed of [1, 2, 0.5]) {
      for (const reverse of [false, true]) {
        const clip = { in: T, out: 9 * T, speed, reverse }
        const dur = durationOf(clip)
        for (const t of [0, dur / 3, dur / 2, dur]) {
          const back = sourceToTimeline(clip, timelineToSource(clip, t))
          assert.ok(Math.abs(back - t) <= 1, `speed=${speed} reverse=${reverse} t=${t} -> ${back}`)
        }
      }
    }
  })

  it('withSpeed keeps the source range and normalizes the speed', () => {
    const clip = { id: 'c1', in: T, out: 7 * T, speed: 1, offset: 4 * T }
    const fast = withSpeed(clip, 2)
    assert.equal(fast.speed, 2)
    assert.equal(fast.in, T) // source in untouched
    assert.equal(fast.out, 7 * T) // source out untouched -> duration halves
    assert.equal(fast.offset, 4 * T) // clip start untouched
    assert.equal(durationOf(fast), 3 * T)
    assert.equal(clip.speed, 1) // pure: original unchanged
    // Broken source range (out <= in) gets a usable floor.
    const broken = withSpeed({ in: T, out: T }, 1)
    assert.equal(broken.out, T + T / 5) // 0.2 s minimum span
    assert.ok(broken.out > (broken.in ?? 0))
    // Invalid speed input falls back to normal speed.
    assert.equal(withSpeed(clip, Number.NaN).speed, 1)
  })
})
