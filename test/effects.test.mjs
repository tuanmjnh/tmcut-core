// @tmcut/core — effects registry tests (Roadmap C6). Run: node --test "test/*.test.mjs"
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EFFECT_REGISTRY, validateEffect, normalizeEffects, buildFfmpegEffectFilters } from '../src/effects.mjs'

const FIRST_WAVE = [
  'blur', 'sharpen', 'vignette', 'grain', 'chromakey', 'lut3d', 'stabilize', 'eq-grade'
]

describe('effects (C6)', () => {
  it('registry ships the first wave with no empty keys', () => {
    assert.deepEqual(Object.keys(EFFECT_REGISTRY).sort(), [...FIRST_WAVE].sort())
    for (const [key, desc] of Object.entries(EFFECT_REGISTRY)) {
      assert.ok(key.length > 0)
      assert.equal(desc.type, key)
      assert.ok(desc.label.length > 0)
      assert.ok(Array.isArray(desc.params) && desc.params.length > 0)
      for (const param of desc.params) {
        assert.ok(param.name.length > 0)
        assert.ok(['number', 'color', 'enum', 'bool'].includes(param.kind))
        // Numbers need a range, enums need options — normalize relies on both.
        if (param.kind === 'number') {
          assert.ok(Number.isFinite(param.min) && Number.isFinite(param.max))
          assert.ok(param.min < param.max)
        }
        if (param.kind === 'enum') assert.ok(Array.isArray(param.options) && param.options.length > 0)
        assert.ok('default' in param)
      }
      // Honesty flag: mapped to FFmpeg filters in R4.
      assert.equal(desc.renderReady, true)
    }
  })

  it('validates shape and rejects unknown types', () => {
    assert.ok(validateEffect(null).length > 0)
    assert.ok(validateEffect('blur').length > 0)
    assert.deepEqual(validateEffect({ type: 'sparkle', params: {} }), ['unknown effect type: sparkle'])
    assert.deepEqual(validateEffect({ type: 'blur', params: { amount: 50 } }), [])
    // Missing params are legal (normalize fills the defaults later).
    assert.deepEqual(validateEffect({ type: 'blur' }), [])
    assert.ok(validateEffect({ type: 'blur', params: 'nope' }).length > 0)
  })

  it('reports out-of-range, wrong-typed and unknown params', () => {
    assert.match(
      validateEffect({ type: 'blur', params: { amount: 200 } })[0],
      /out of range \[0, 100\]/
    )
    assert.match(
      validateEffect({ type: 'eq-grade', params: { brightness: -150 } })[0],
      /out of range \[-100, 100\]/
    )
    assert.match(
      validateEffect({ type: 'blur', params: { amount: 'high' } })[0],
      /must be a number/
    )
    assert.match(
      validateEffect({ type: 'blur', params: { bogus: 1 } })[0],
      /unknown param: bogus/
    )
    assert.match(
      validateEffect({ type: 'chromakey', params: { color: 'green' } })[0],
      /hex color/
    )
    assert.match(
      validateEffect({ type: 'chromakey', params: { spill: 'yes' } })[0],
      /must be a boolean/
    )
    assert.match(
      validateEffect({ type: 'lut3d', params: { lut: 'noir' } })[0],
      /not in options/
    )
  })

  it('normalize drops unknown entries and unknown fields', () => {
    const list = normalizeEffects([
      { type: 'blur', params: { amount: 80, bogus: 1 }, extra: true },
      { type: 'sparkle', params: {} },
      'garbage',
      { type: 'chromakey', params: { color: '#ff0000' } },
      null
    ])
    assert.equal(list.length, 2)
    // Registry whitelist: `bogus` gone, entry-level `extra` never copied.
    assert.deepEqual(list[0], { type: 'blur', params: { amount: 80 } })
    assert.deepEqual(list[1], {
      type: 'chromakey',
      params: { color: '#ff0000', similarity: 30, blend: 10, spill: true }
    })
    for (const effect of list) assert.deepEqual(validateEffect(effect), [])
    assert.deepEqual(normalizeEffects('nope'), [])
  })

  it('normalize clamps numbers and repairs invalid values to defaults', () => {
    const [blurred] = normalizeEffects([{ type: 'blur', params: { amount: 999 } }])
    assert.equal(blurred.params.amount, 100)
    const [graded] = normalizeEffects([{ type: 'eq-grade', params: { brightness: 'x', contrast: 150 } }])
    assert.deepEqual(graded.params, { brightness: 0, contrast: 150, saturation: 100, temp: 0 })
    const [keyed] = normalizeEffects([{ type: 'chromakey', params: { color: 'green' } }])
    assert.equal(keyed.params.color, '#00ff00')
    const [loose] = normalizeEffects([{ type: 'blur' }])
    assert.equal(loose.params.amount, 50)
  })

  describe('buildFfmpegEffectFilters (Roadmap R4, core C6)', () => {
    it('returns empty array for empty or invalid input', () => {
      assert.deepEqual(buildFfmpegEffectFilters(null), [])
      assert.deepEqual(buildFfmpegEffectFilters([]), [])
      assert.deepEqual(buildFfmpegEffectFilters('bogus'), [])
    })

    it('maps blur and sharpen to gblur and unsharp', () => {
      const filters = buildFfmpegEffectFilters([
        { type: 'blur', params: { amount: 50 } },
        { type: 'sharpen', params: { amount: 60 } }
      ])
      assert.deepEqual(filters, ['gblur=sigma=10', 'unsharp=5:5:1.5:5:5:0.0'])
    })

    it('maps vignette, grain, and chromakey', () => {
      const filters = buildFfmpegEffectFilters([
        { type: 'vignette', params: { intensity: 50 } },
        { type: 'grain', params: { amount: 40, size: 'coarse' } },
        { type: 'chromakey', params: { color: '#00ff00', similarity: 40, blend: 15 } }
      ])
      assert.equal(filters.length, 3)
      assert.ok(filters[0].startsWith('vignette=angle='))
      assert.equal(filters[1], 'noise=alls=24:allf=t')
      assert.equal(filters[2], 'colorkey=0x00ff00:0.40:0.15')
    })

    it('maps lut3d presets', () => {
      const filters = buildFfmpegEffectFilters([
        { type: 'lut3d', params: { lut: 'warm' } },
        { type: 'lut3d', params: { lut: 'cool' } },
        { type: 'lut3d', params: { lut: 'cinematic' } },
        { type: 'lut3d', params: { lut: 'vintage' } },
        { type: 'lut3d', params: { lut: 'neutral' } }
      ])
      assert.equal(filters.length, 4) // neutral is no-op
      assert.ok(filters[0].includes('colorbalance'))
      assert.ok(filters[1].includes('colorbalance'))
      assert.ok(filters[2].includes('cross_process'))
      assert.ok(filters[3].includes('vintage') || filters[3].includes('colorbalance'))
    })

    it('maps stabilize and eq-grade', () => {
      const filters = buildFfmpegEffectFilters([
        { type: 'stabilize', params: { strength: 50 } },
        { type: 'eq-grade', params: { brightness: 10, contrast: 120, saturation: 110 } }
      ])
      assert.equal(filters.length, 2)
      assert.ok(filters[0].startsWith('deshake=rx='))
      assert.equal(filters[1], 'eq=brightness=0.05:contrast=1.2:saturation=1.1')
    })
  })
})
