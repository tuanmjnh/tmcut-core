// @tmcut/core — effects registry tests (Roadmap C6). Run: node --test "test/*.test.mjs"
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EFFECT_REGISTRY, validateEffect, normalizeEffects, buildFfmpegEffectFilters } from '../src/effects.mjs'

const FIRST_WAVE = [
  'blur', 'sharpen', 'vignette', 'grain', 'chromakey', 'lut3d', 'stabilize', 'eq-grade'
]

// R128: the registry grew from 8 to a CapCut-scale library, so the pin is
// structural (shape + honesty) instead of an exact key list — plus a guard
// that the original 8 keys never disappear (stored projects depend on them).
const CATEGORIES = ['blur', 'sharpen', 'light', 'color', 'stylize', 'distort', 'keying', 'motion', 'retro', 'texture']

// Effects allowed to produce zero filters at their DEFAULT params: a LUT
// preset named 'neutral' is a deliberate no-op grade. Nothing else may be
// in this list — renderReady:true means "buildFfmpegEffectFilters emits a
// filter at registry defaults" (honesty rule, roadmap R128).
const NO_OP_AT_DEFAULT = ['lut3d']

describe('effects (C6)', () => {
  it('registry keeps the first wave and stays structurally sound', () => {
    for (const legacy of FIRST_WAVE) {
      assert.ok(EFFECT_REGISTRY[legacy], `lost legacy effect: ${legacy}`)
    }
    assert.ok(Object.keys(EFFECT_REGISTRY).length > FIRST_WAVE.length, 'R128 expansion missing')
    for (const [key, desc] of Object.entries(EFFECT_REGISTRY)) {
      assert.ok(key.length > 0)
      assert.equal(desc.type, key)
      assert.ok(desc.label.length > 0)
      assert.ok(CATEGORIES.includes(desc.category), `${key}: bad category ${desc.category}`)
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
      // Honesty flag: every shipped effect is mapped to FFmpeg filters.
      assert.equal(desc.renderReady, true)
    }
  })

  it('every renderReady effect emits filters at its default params (honesty rule)', () => {
    for (const [key, desc] of Object.entries(EFFECT_REGISTRY)) {
      const defaults = Object.fromEntries(desc.params.map(p => [p.name, p.default]))
      const filters = buildFfmpegEffectFilters([{ type: key, params: defaults }])
      if (NO_OP_AT_DEFAULT.includes(key)) {
        // The no-op allowance is narrow: only the neutral preset qualifies.
        const nonNeutral = desc.params.find(p => p.kind === 'enum' && p.options.length > 1)
        assert.ok(nonNeutral, `${key}: whitelisted no-op but has no multi-option enum`)
        for (const option of nonNeutral.options) {
          if (option === defaults[nonNeutral.name]) continue
          const f = buildFfmpegEffectFilters([{ type: key, params: { ...defaults, [nonNeutral.name]: option } }])
          assert.ok(f.length >= 1, `${key}: enum option ${option} renders nothing`)
        }
        continue
      }
      assert.ok(Array.isArray(filters) && filters.length >= 1, `${key}: renderReady but emits no filter at defaults`)
      // The renderer comma-chains the output: every entry must stay a plain
      // linear filter list element — no filtergraph labels or sub-graphs.
      assert.ok(filters.every(f => typeof f === 'string' && f.length > 0 && !f.includes(';') && !f.includes('[')),
        `${key}: filters must be comma-chain-safe (no ';' or '[' graph syntax)`)
    }
  })

  it('lut3d ships the R128 preset grid (>= 18 grades)', () => {
    const lut = EFFECT_REGISTRY.lut3d.params.find(p => p.name === 'lut')
    assert.ok(lut.options.length >= 18)
    // Ambient presets were the original five presets, minus the R128 neutral
    // no-op prepended — stored projects resolve 'warm'/'cool'/… byte-identically.
    assert.deepEqual(lut.options.slice(0, 5), ['neutral', 'warm', 'cool', 'cinematic', 'vintage'])
    assert.ok(lut.options.includes('teal-orange'))
    assert.ok(lut.options.includes('cyberpunk'))
    // An unknown preset must still validate-reject (options list is the whitelist).
    assert.ok(validateEffect({ type: 'lut3d', params: { lut: 'nope' } }).length > 0)
  })

  it('eq-grade carries the R128 grading params', () => {
    const names = EFFECT_REGISTRY['eq-grade'].params.map(p => p.name)
    for (const n of ['brightness', 'contrast', 'saturation', 'temp', 'hue', 'gamma', 'fade', 'vibrance']) {
      assert.ok(names.includes(n), `eq-grade missing ${n}`)
    }
    // Non-default extras must actually reach the filter chain.
    const filters = buildFfmpegEffectFilters([
      { type: 'eq-grade', params: { brightness: 0, contrast: 100, saturation: 100, temp: 0, hue: 30, gamma: 120, fade: 40, vibrance: 25 } }
    ])
    const joined = filters.join(',')
    assert.ok(joined.includes('hue=h=30'))
    assert.ok(joined.includes('gamma=1.2'))
    assert.ok(joined.includes('vibrance=intensity=0.25'))
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
      validateEffect({ type: 'lut3d', params: { lut: 'not-a-preset' } })[0],
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
    // R128 added hue/gamma/fade/vibrance — normalize fills every default.
    assert.deepEqual(graded.params, { brightness: 0, contrast: 150, saturation: 100, temp: 0, hue: 0, gamma: 100, fade: 0, vibrance: 0 })
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
