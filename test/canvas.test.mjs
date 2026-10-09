// @tmcut/core — canvas tests. Run: node --test "test/*.test.mjs"
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  aspectValue,
  orientationOf,
  ratioIdOf,
  findCanvasPreset,
  findCanvasPresetByDimensions,
  normalizeCanvas,
  computeFitObjectStyle,
  buildFfmpegFitFilters,
  reframeTransform,
  previewScale
} from '../src/canvas.mjs'

describe('canvas', () => {
  it('computes aspect values and orientations', () => {
    assert.equal(aspectValue(1920, 1080), 16 / 9)
    assert.equal(aspectValue(0, 1080), 0)
    assert.equal(orientationOf(1080, 1920), 'portrait')
    assert.equal(orientationOf(1080, 1080), 'square')
    assert.equal(orientationOf(0, 0), 'landscape')
  })

  it('resolves presets and ratio labels', () => {
    assert.equal(findCanvasPreset('9:16').width, 1080)
    assert.equal(findCanvasPreset('nope'), null)
    assert.equal(findCanvasPresetByDimensions(1080, 1920).id, '9:16')
    assert.equal(ratioIdOf(1920, 1080), '16:9')
    assert.equal(ratioIdOf(100, 100), '100x100')
  })

  it('normalizes partial canvas input to v3 with rational fps', () => {
    const canvas = normalizeCanvas({ width: 1080, height: 1920, fps: 30 })
    assert.equal(canvas.width, 1080)
    assert.deepEqual(canvas.fps, { numerator: 30, denominator: 1 })
    assert.equal(canvas.aspectRatio.id, '9:16')
    const defaults = normalizeCanvas(undefined)
    assert.equal(defaults.width, 1920)
    assert.deepEqual(defaults.background, { type: 'color', value: '#000000' })
    const kept = normalizeCanvas({ width: 0, height: -5, fps: 0 })
    assert.equal(kept.width, 1920)
    assert.deepEqual(kept.fps, { numerator: 30, denominator: 1 })
  })

  it('computes preview fit styles per mode', () => {
    assert.deepEqual(computeFitObjectStyle('fit'), { objectFit: 'contain', objectPosition: '50% 50%' })
    assert.deepEqual(computeFitObjectStyle('fill'), { objectFit: 'cover', objectPosition: '50% 50%' })
    assert.deepEqual(computeFitObjectStyle('stretch'), { objectFit: 'fill', objectPosition: '50% 50%' })
    assert.deepEqual(computeFitObjectStyle('smart', 0.25, 0.75), { objectFit: 'cover', objectPosition: '25% 75%' })
    const cropped = computeFitObjectStyle('crop', 0.5, 0.5, { x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
    assert.equal(cropped.objectFit, 'cover')
    assert.deepEqual(computeFitObjectStyle('crop'), { objectFit: 'contain', objectPosition: '50% 50%' })
  })

  it('builds ffmpeg fit filters', () => {
    const fit = buildFfmpegFitFilters('fit', 1920, 1080)
    assert.equal(fit.length, 1)
    assert.ok(fit[0].includes('pad=1920:1080'))
    assert.ok(buildFfmpegFitFilters('fill', 1920, 1080)[0].includes('crop=1920:1080'))
    assert.ok(buildFfmpegFitFilters('stretch', 1920, 1080)[0] === 'scale=1920:1080')
    assert.ok(buildFfmpegFitFilters('smart', 1920, 1080, { focusX: 0.2 })[0].includes('0.2000'))
    const cropped = buildFfmpegFitFilters('crop', 1920, 1080, { cropRect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } })
    assert.equal(cropped.length, 2)
  })

  it('reframes offsets proportionally', () => {
    assert.deepEqual(reframeTransform(100, 50, 1920, 1080, 1080, 1920), { x: 56, y: 89 })
    assert.deepEqual(reframeTransform(10, 20, 0, 0, 5, 5), { x: 10, y: 20 })
  })

  it('computes preview scale factors', () => {
    assert.equal(previewScale(960, 1920), 0.5)
    assert.equal(previewScale(1920, 1920), 1)
    assert.equal(previewScale(0, 1920), 1)
    assert.equal(previewScale(960, 0), 1)
  })
})
