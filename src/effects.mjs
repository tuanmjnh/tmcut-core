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
  'blur': {
    type: 'blur',
    label: 'Blur',
    renderReady: true,
    params: [
      { name: 'amount', kind: 'number', min: 0, max: 100, default: 50 }
    ]
  },
  'sharpen': {
    type: 'sharpen',
    label: 'Sharpen',
    renderReady: true,
    params: [
      { name: 'amount', kind: 'number', min: 0, max: 100, default: 50 }
    ]
  },
  'vignette': {
    type: 'vignette',
    label: 'Vignette',
    renderReady: true,
    params: [
      { name: 'intensity', kind: 'number', min: 0, max: 100, default: 50 }
    ]
  },
  'grain': {
    type: 'grain',
    label: 'Grain',
    renderReady: true,
    params: [
      { name: 'amount', kind: 'number', min: 0, max: 100, default: 30 },
      { name: 'size', kind: 'enum', options: ['fine', 'medium', 'coarse'], default: 'fine' }
    ]
  },
  'chromakey': {
    type: 'chromakey',
    label: 'Chroma Key',
    renderReady: true,
    params: [
      { name: 'color', kind: 'color', default: '#00ff00' },
      { name: 'similarity', kind: 'number', min: 0, max: 100, default: 30 },
      { name: 'blend', kind: 'number', min: 0, max: 100, default: 10 },
      { name: 'spill', kind: 'bool', default: true }
    ]
  },
  'lut3d': {
    type: 'lut3d',
    label: 'LUT 3D',
    renderReady: true,
    params: [
      // Preset grades for wave 1; file-based `.cube` loading arrives with
      // the compiler round (R4) together with a new `file` param kind.
      { name: 'lut', kind: 'enum', options: ['neutral', 'warm', 'cool', 'cinematic', 'vintage'], default: 'neutral' }
    ]
  },
  'stabilize': {
    type: 'stabilize',
    label: 'Stabilize',
    renderReady: true,
    params: [
      { name: 'strength', kind: 'number', min: 0, max: 100, default: 50 }
    ]
  },
  'eq-grade': {
    type: 'eq-grade',
    label: 'EQ / Grade',
    renderReady: true,
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

/**
 * Map an array of clip effects to FFmpeg video filter strings (Roadmap R4, core C6).
 * Safe against dirty or unnormalized inputs (runs normalizeEffects first).
 * Order of effects is preserved.
 *
 * @param {Array<object>} effects
 * @returns {string[]} array of FFmpeg filter strings
 */
export function buildFfmpegEffectFilters(effects) {
  const clean = normalizeEffects(effects)
  if (clean.length === 0) return []

  const filters = []
  for (const { type, params } of clean) {
    switch (type) {
      case 'blur': {
        const amount = Number(params.amount) || 0
        if (amount > 0) {
          const sigma = Number(((amount / 100) * 20).toFixed(2))
          filters.push(`gblur=sigma=${sigma}`)
        }
        break
      }
      case 'sharpen': {
        const amount = Number(params.amount) || 0
        if (amount > 0) {
          const la = Number(((amount / 100) * 2.5).toFixed(2))
          filters.push(`unsharp=5:5:${la}:5:5:0.0`)
        }
        break
      }
      case 'vignette': {
        const intensity = Number(params.intensity) || 0
        if (intensity > 0) {
          const angle = Number(((Math.PI / 4) * (intensity / 100 * 1.5)).toFixed(4))
          filters.push(`vignette=angle=${angle}`)
        }
        break
      }
      case 'grain': {
        const amount = Number(params.amount) || 0
        if (amount > 0) {
          const flag = params.size === 'coarse' ? 't' : params.size === 'medium' ? 'u' : 't+u'
          filters.push(`noise=alls=${Math.round(amount * 0.6)}:allf=${flag}`)
        }
        break
      }
      case 'chromakey': {
        const hex = (params.color || '#00ff00').replace('#', '')
        const sim = (Number(params.similarity || 30) / 100).toFixed(2)
        const bl = (Number(params.blend || 10) / 100).toFixed(2)
        filters.push(`colorkey=0x${hex}:${sim}:${bl}`)
        break
      }
      case 'lut3d': {
        switch (params.lut) {
          case 'warm':
            filters.push('colorbalance=rs=0.12:gs=0.02:bs=-0.1')
            break
          case 'cool':
            filters.push('colorbalance=rs=-0.1:gs=0.02:bs=0.15')
            break
          case 'cinematic':
            filters.push('curves=preset=cross_process,eq=contrast=1.1:saturation=1.15')
            break
          case 'vintage':
            filters.push('colorbalance=rs=0.15:gs=0.08:bs=-0.12,eq=contrast=0.95:saturation=0.85')
            break
          case 'neutral':
          default:
            break
        }
        break
      }
      case 'stabilize': {
        const strength = Number(params.strength) || 50
        const rx = Math.max(8, Math.round((strength / 100) * 32))
        filters.push(`deshake=rx=${rx}:ry=${rx}:edge=mirror`)
        break
      }
      case 'eq-grade': {
        const b = Number(params.brightness || 0)
        const c = Number(params.contrast || 100)
        const s = Number(params.saturation || 100)
        if (b !== 0 || c !== 100 || s !== 100) {
          const bVal = Number((b / 100 * 0.5).toFixed(3))
          const cVal = Number((c / 100).toFixed(3))
          const sVal = Number((s / 100).toFixed(3))
          filters.push(`eq=brightness=${bVal}:contrast=${cVal}:saturation=${sVal}`)
        }
        break
      }
    }
  }
  return filters
}
