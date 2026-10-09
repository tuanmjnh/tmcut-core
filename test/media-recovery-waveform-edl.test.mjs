// @tmcut/core — media / recovery / waveform / edl tests. Run: node --test test/
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeMediaPath,
  mediaFileKey,
  mediaFileName,
  extensionOf,
  classifyAssetKind,
  formatDurationSec,
  formatFileSize
} from '../src/media.mjs'
import { decideRecovery } from '../src/recovery.mjs'
import { int16ToPeaks, clampWaveformPoints } from '../src/waveform.mjs'
import { validateEdl, selectSegments } from '../src/edl.mjs'

describe('media', () => {
  it('normalizes windows paths', () => {
    assert.equal(normalizeMediaPath('D:\\Videos\\A.MP4'), 'D:/Videos/A.MP4')
    assert.equal(mediaFileKey('D:\\Videos\\A.MP4'), 'd:/videos/a.mp4')
    assert.equal(mediaFileName('D:/Videos/a.mp4'), 'a.mp4')
    assert.equal(extensionOf('archive.tar.gz'), 'gz')
    assert.equal(extensionOf('noext'), '')
  })

  it('classifies asset kinds', () => {
    assert.equal(classifyAssetKind('a.mp4'), 'video')
    assert.equal(classifyAssetKind('a.mkv'), 'video')
    assert.equal(classifyAssetKind('a.mp3'), 'audio')
    assert.equal(classifyAssetKind('a.png'), 'image')
    assert.equal(classifyAssetKind('a.txt'), null)
  })

  it('formats durations and sizes like the app', () => {
    assert.equal(formatDurationSec(76), '1:16')
    assert.equal(formatDurationSec(0), '0:00')
    assert.equal(formatFileSize(0), '0 B')
    assert.equal(formatFileSize(1536), '1.5 KB')
    assert.equal(formatFileSize(5 * 1024 * 1024), '5.0 MB')
  })
})

describe('recovery', () => {
  it('decides recovery exactly like the app', () => {
    assert.equal(decideRecovery({ hasRecovery: false, recoveryUpdatedAtMs: 5, hasProject: true, projectMtimeMs: 1 }), 'none')
    assert.equal(decideRecovery({ hasRecovery: true, recoveryUpdatedAtMs: null, hasProject: true, projectMtimeMs: 1 }), 'none')
    assert.equal(decideRecovery({ hasRecovery: true, recoveryUpdatedAtMs: NaN, hasProject: true, projectMtimeMs: 1 }), 'none')
    assert.equal(decideRecovery({ hasRecovery: true, recoveryUpdatedAtMs: 5, hasProject: false, projectMtimeMs: 0 }), 'force')
    assert.equal(decideRecovery({ hasRecovery: true, recoveryUpdatedAtMs: 5, hasProject: true, projectMtimeMs: NaN }), 'suggest')
    assert.equal(decideRecovery({ hasRecovery: true, recoveryUpdatedAtMs: 5, hasProject: true, projectMtimeMs: 3 }), 'suggest')
    assert.equal(decideRecovery({ hasRecovery: true, recoveryUpdatedAtMs: 3, hasProject: true, projectMtimeMs: 5 }), 'none')
  })
})

describe('waveform', () => {
  it('reduces samples to normalized peaks', () => {
    const peaks = int16ToPeaks([0, 16384, -32768, 8192], 2)
    assert.equal(peaks.length, 2)
    assert.ok(peaks.every(p => p >= 0 && p <= 1))
    assert.deepEqual(int16ToPeaks([], 4), [0, 0, 0, 0])
  })

  it('clamps arbitrary input', () => {
    assert.deepEqual(clampWaveformPoints([2, -1, NaN, 0.5]), [1, 0, 0, 0.5])
    assert.deepEqual(clampWaveformPoints(null), [])
  })
})

describe('edl', () => {
  function validEdl() {
    return {
      version: 1,
      assetId: 'asset_1',
      profile: 'viral-shorts',
      segments: [
        { start: 0, end: 5, score: 0.9, reason: 'speech' },
        { start: 5, end: 8, score: 0.2, reason: 'silence' }
      ],
      createdAt: new Date().toISOString(),
      analyzerVersion: 'scene-1'
    }
  }

  it('accepts a well-formed EDL', () => {
    assert.deepEqual(validateEdl(validEdl()), [])
  })

  it('rejects malformed EDLs', () => {
    assert.ok(validateEdl(null).length > 0)
    assert.ok(validateEdl({ ...validEdl(), version: 2 }).length > 0)
    assert.ok(validateEdl({ ...validEdl(), profile: 'nope' }).length > 0)
    assert.ok(validateEdl({ ...validEdl(), segments: [{ start: 5, end: 5, score: 2, reason: '' }] }).length >= 3)
    assert.ok(validateEdl({ ...validEdl(), segments: 'x' }).length > 0)
  })

  it('selects segments above threshold, sorted', () => {
    const selected = selectSegments(validEdl(), 0.5)
    assert.equal(selected.length, 1)
    assert.equal(selected[0].reason, 'speech')
  })
})
