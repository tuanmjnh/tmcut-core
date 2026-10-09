// =============================================================================
//  @tmcut/core — canvas
//  Ported from app/utils/tmcut/canvas.ts (docs Phase 4: Canvas Engine).
//  Pure geometry: presets, orientation, fit styles, ffmpeg fit filters and
//  reframe math. Canvas fps is rational (docs section 3); numeric inputs
//  are coerced via fpsToRational.
// =============================================================================

import { fpsToRational } from './time.mjs'

export const TMUTCANVAS_PRESETS = [
  { id: '16:9', width: 1920, height: 1080, orientation: 'landscape', icon: 'i-lucide-tv' },
  { id: '9:16', width: 1080, height: 1920, orientation: 'portrait', icon: 'i-lucide-smartphone' },
  { id: '1:1', width: 1080, height: 1080, orientation: 'square', icon: 'i-lucide-square' },
  { id: '4:5', width: 1080, height: 1350, orientation: 'portrait', icon: 'i-lucide-rectangle-vertical' },
  { id: '4:3', width: 1440, height: 1080, orientation: 'landscape', icon: 'i-lucide-proportions' },
  { id: '21:9', width: 2560, height: 1080, orientation: 'landscape', icon: 'i-lucide-monitor' }
]

export const TMUTCUT_SOCIAL_PRESETS = [
  { id: 'youtube', presetId: '16:9', icon: 'i-lucide-tv' },
  { id: 'youtube-shorts', presetId: '9:16', icon: 'i-lucide-smartphone' },
  { id: 'tiktok', presetId: '9:16', icon: 'i-simple-icons-tiktok' },
  { id: 'instagram-reels', presetId: '9:16', icon: 'i-simple-icons-instagram' },
  { id: 'instagram-feed', presetId: '4:5', icon: 'i-simple-icons-instagram' },
  { id: 'facebook', presetId: '16:9', icon: 'i-simple-icons-facebook' }
]

export const TMUTCUT_FIT_MODES = ['fit', 'fill', 'crop', 'stretch', 'smart']

function gcd(a, b) {
  let x = Math.abs(Math.round(a))
  let y = Math.abs(Math.round(b))
  while (y > 0) {
    const t = x % y
    x = y
    y = t
  }
  return x || 1
}

export function aspectValue(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return 0
  const divisor = gcd(width, height)
  return width / divisor / (height / divisor)
}

export function orientationOf(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return 'landscape'
  if (width > height) return 'landscape'
  if (width < height) return 'portrait'
  return 'square'
}

export function findCanvasPreset(id) {
  return TMUTCANVAS_PRESETS.find(preset => preset.id === id) ?? null
}

export function findCanvasPresetByDimensions(width, height) {
  return TMUTCANVAS_PRESETS.find(preset => preset.width === Math.round(width) && preset.height === Math.round(height)) ?? null
}

export function ratioIdOf(width, height) {
  const preset = findCanvasPresetByDimensions(width, height)
  return preset ? preset.id : `${width}x${height}`
}

export function ratioLabel(width, height) {
  return ratioIdOf(width, height)
}

/** Normalize partial canvas input to a v3 canvas (rational fps). */
export function normalizeCanvas(canvas) {
  const width = Math.round(canvas?.width && canvas.width > 0 ? canvas.width : 1920)
  const height = Math.round(canvas?.height && canvas.height > 0 ? canvas.height : 1080)
  const fpsInput = canvas?.fps
  const fps = fpsInput && typeof fpsInput === 'object'
    ? fpsInput
    : fpsToRational(typeof fpsInput === 'number' && fpsInput > 0 ? fpsInput : 30)
  const aspectRatio = canvas?.aspectRatio?.id
    ? {
        id: canvas.aspectRatio.id,
        value: canvas.aspectRatio.value || aspectValue(width, height),
        orientation: canvas.aspectRatio.orientation || orientationOf(width, height)
      }
    : {
        id: ratioIdOf(width, height),
        value: aspectValue(width, height),
        orientation: orientationOf(width, height)
      }
  const background = canvas?.background?.type
    ? (canvas.background.value !== undefined
        ? { type: canvas.background.type, value: canvas.background.value }
        : { type: canvas.background.type })
    : { type: 'color', value: '#000000' }
  return { width, height, fps, aspectRatio, background }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

/** CSS object-fit/position for a fit mode (preview adapter). */
export function computeFitObjectStyle(mode, focusX = 0.5, focusY = 0.5, cropRect) {
  if (mode === 'fill') return { objectFit: 'cover', objectPosition: '50% 50%' }
  if (mode === 'stretch') return { objectFit: 'fill', objectPosition: '50% 50%' }
  if (mode === 'smart') {
    const fx = Math.round(clamp01(focusX) * 100)
    const fy = Math.round(clamp01(focusY) * 100)
    return { objectFit: 'cover', objectPosition: `${fx}% ${fy}%` }
  }
  if (mode === 'crop' && cropRect) {
    const w = clamp01(cropRect.w)
    const h = clamp01(cropRect.h)
    const cx = clamp01(cropRect.x) + w / 2
    const cy = clamp01(cropRect.y) + h / 2
    return { objectFit: 'cover', objectPosition: `${Math.round(cx * 100)}% ${Math.round(cy * 100)}%` }
  }
  return { objectFit: 'contain', objectPosition: '50% 50%' }
}

/** FFmpeg filter chain for a fit mode (render adapter, same semantics). */
export function buildFfmpegFitFilters(mode, canvasW, canvasH, options = {}) {
  const w = Math.max(2, Math.floor(canvasW / 2) * 2)
  const h = Math.max(2, Math.floor(canvasH / 2) * 2)
  const padColor = options.padColor || 'black'
  const fit = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:${padColor}`
  if (mode === 'fill') return [`scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`]
  if (mode === 'stretch') return [`scale=${w}:${h}`]
  if (mode === 'smart') {
    const fx = clamp01(options.focusX ?? 0.5)
    const fy = clamp01(options.focusY ?? 0.5)
    return [`scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:x='(iw-${w})*${fx.toFixed(4)}':y='(ih-${h})*${fy.toFixed(4)}'`]
  }
  if (mode === 'crop' && options.cropRect) {
    const cx = clamp01(options.cropRect.x)
    const cy = clamp01(options.cropRect.y)
    const cw = clamp01(options.cropRect.w)
    const ch = clamp01(options.cropRect.h)
    if (cw > 0 && ch > 0 && (cx > 0 || cy > 0 || cw < 1 || ch < 1)) {
      return [
        `crop=w='iw*${cw.toFixed(4)}':h='ih*${ch.toFixed(4)}':x='iw*${cx.toFixed(4)}':y='ih*${cy.toFixed(4)}'`,
        fit
      ]
    }
    return [fit]
  }
  return [fit]
}

/** Proportionally reframe manual x/y offsets across a canvas switch. */
export function reframeTransform(x, y, fromW, fromH, toW, toH) {
  if (!fromW || !fromH || !toW || !toH) return { x, y }
  return {
    x: Math.round((x || 0) * (toW / fromW)),
    y: Math.round((y || 0) * (toH / fromH))
  }
}

/**
 * Preview scale factor: CSS pixels per canvas pixel along the width axis.
 * Overlays authored in canvas units (text size/position) multiply by this
 * to stay proportional at any player size (fixes the hardcoded 0.7 factor).
 */
export function previewScale(containerWidth, canvasWidth) {
  if (!Number.isFinite(containerWidth) || !Number.isFinite(canvasWidth) || canvasWidth <= 0 || containerWidth <= 0) return 1
  return containerWidth / canvasWidth
}
