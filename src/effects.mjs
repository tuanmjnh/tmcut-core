// =============================================================================
//  @tmcut/core — effects registry (Roadmap C6)
//  First-wave effect descriptors + validation + normalization for clip
//  `effects: [{ type, params }]` (docs DSL v3, TmcutClipEffect).
//
//  `renderReady` is the honesty flag: it stays FALSE until the export
//  compiler actually maps the effect (Roadmap R4) — consumers must show a
//  truthful "not exported yet" badge instead of implying the file will
//  contain the effect. Preview (CSS/filter) may still render it.
//
//  `label` is an English constant (AGENTS.md); UIs translate by the
//  registry type key and treat `label` as a developer fallback only.
// =============================================================================

/**
 * Effect parameter descriptor. Kinds (spec C6): number (min/max range),
 * color (hex string), enum (options list), bool (true/false).
 */
// EffectParam = { name, kind, min?, max?, default?, options? }

export const EFFECT_REGISTRY = {
  blur: {
    type: 'blur',
    label: 'Blur',
    renderReady: false,
    params: [
      { name: 'amount', kind: 'number', min: 0, max: 100, default: 50 }
    ]
  },
  sharpen: {
    type: 'sharpen',
    label: 'Sharpen',
    renderReady: false,
    params: [
      { name: 'amount', kind: 'number', min: 0, max: 100, default: 50 }
    ]
  },
  vignette: {
    type: 'vignette',
    label: 'Vignette',
    renderReady: false,
    params: [
      { name: 'intensity', kind: 'number', min: 0, max: 100, default: 50 }
    ]
  },
  grain: {
    type: 'grain',
    label: 'Grain',
    renderReady: false,
    params: [
      { name: 'amount', kind: 'number', min: 0, max: 100, default: 30 },
      { name: 'size', kind: 'enum', options: ['fine', 'medium', 'coarse'], default: 'fine' }
    ]
  },
  chromakey: {
    type: 'chromakey',
    label: 'Chroma Key',
    renderReady: false,
    params: [
      { name: 'color', kind: 'color', default: '#00ff00' },
      { name: 'similarity', kind: 'number', min: 0, max: 100, default: 30 },
      { name: 'blend', kind: 'number', min: 0, max: 100, default: 10 },
      { name: 'spill', kind: 'bool', default: true }
    ]
  },
  lut3d: {
    type: 'lut3d',
    label: 'LUT 3D',
    renderReady: false,
    params: [
      // Preset grades for wave 1; file-based `.cube` loading arrives with
      // the compiler round (R4) together with a new `file` param kind.
      { name: 'lut', kind: 'enum', options: ['neutral', 'warm', 'cool', 'cinematic', 'vintage'], default: 'neutral' }
    ]
  },
  stabilize: {
    type: 'stabilize',
    label: 'Stabilize',
    renderReady: false,
    params: [
      { name: 'strength', kind: 'number', min: 0, max: 100, default: 50 }
    ]
  },
  'eq-grade': {
    type: 'eq-grade',
    label: 'EQ / Grade',
    renderReady: false,
    params: [
      { name: 'brightness', kind: 'number', min: -100, max: 100, default: 0 },
      { name: 'contrast', kind: 'number', min: 0, max: 200, default: 100 },
      { name: 'saturation', kind: 'number', min: 0, max: 200, default: 100 }
    ]
  }
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

function paramErrors(type, param, value) {
  const at = `effect ${type}.${param.name}`
  switch (param.kind) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return [`${at} must be a number`]
      }
      if (value < param.min || value > param.max) {
        return [`${at}: ${value} out of range [${param.min}, ${param.max}]`]
      }
      return []
    }
    case 'color': {
      if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
        return [`${at} must be a hex color (#rgb/#rrggbb/#rrggbbaa)`]
      }
      return []
    }
    case 'enum': {
      if (!Array.isArray(param.options) || !param.options.includes(value)) {
        return [`${at}: ${JSON.stringify(value)} not in options [${(param.options ?? []).join(', ')}]`]
      }
      return []
    }
    case 'bool': {
      if (typeof value !== 'boolean') return [`${at} must be a boolean`]
      return []
    }
    default:
      return [`${at}: unsupported param kind ${param.kind}`]
  }
}

/**
 * Structural validation of ONE effect (error style of `validateTimeline`:
 * human-readable strings, empty = valid). Only PRESENT params are checked —
 * missing params are legal (normalize fills the defaults).
 */
export function validateEffect(effect) {
  if (!effect || typeof effect !== 'object' || Array.isArray(effect)) {
    return ['effect must be an object']
  }
  const desc = EFFECT_REGISTRY[effect.type]
  if (!desc) return [`unknown effect type: ${effect.type}`]
  const params = effect.params
  if (params === undefined || params === null) return []
  if (typeof params !== 'object' || Array.isArray(params)) {
    return [`effect ${effect.type} params must be an object`]
  }
  const errors = []
  for (const [key, value] of Object.entries(params)) {
    const param = desc.params.find(candidate => candidate.name === key)
    if (!param) {
      errors.push(`effect ${effect.type} has unknown param: ${key}`)
      continue
    }
    errors.push(...paramErrors(effect.type, param, value))
  }
  return errors
}

function coerceValue(param, raw) {
  const fallback = param.default
  switch (param.kind) {
    case 'number': {
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return Math.min(param.max, Math.max(param.min, raw))
      }
      return fallback
    }
    case 'color': {
      return typeof raw === 'string' && HEX_COLOR.test(raw) ? raw : fallback
    }
    case 'enum': {
      return Array.isArray(param.options) && param.options.includes(raw) ? raw : fallback
    }
    case 'bool':
      return typeof raw === 'boolean' ? raw : fallback
    default:
      return fallback
  }
}

/**
 * Clean a dirty effects list into well-formed `TmcutClipEffect[]`:
 * unknown entries/types are DROPPED, unknown param fields are dropped
 * (registry whitelist), numbers are clamped into range, invalid values
 * fall back to the param default, and every registry param is filled —
 * so the output always passes `validateEffect`.
 */
export function normalizeEffects(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const entry of list) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const desc = EFFECT_REGISTRY[entry.type]
    if (!desc) continue
    const params = entry.params && typeof entry.params === 'object' && !Array.isArray(entry.params)
      ? entry.params
      : {}
    const clean = {}
    for (const param of desc.params) {
      clean[param.name] = coerceValue(param, params[param.name])
    }
    out.push({ type: entry.type, params: clean })
  }
  return out
}
