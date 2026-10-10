// @tmcut/core — effects registry tests (Roadmap C6). Run: node --test "test/*.test.mjs"
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EFFECT_REGISTRY, validateEffect, normalizeEffects } from '../src/effects.mjs'

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
      // Honesty flag: nothing exports until the compiler maps it (R4).
      assert.equal(desc.renderReady, false)
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
    assert.deepEqual(graded.params, { brightness: 0, contrast: 150, saturation: 100 })
    const [keyed] = normalizeEffects([{ type: 'chromakey', params: { color: 'green' } }])
    assert.equal(keyed.params.color, '#00ff00')
    const [loose] = normalizeEffects([{ type: 'blur' }])
    assert.equal(loose.params.amount, 50)
  })
})
