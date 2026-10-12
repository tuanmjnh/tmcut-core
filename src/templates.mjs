// =============================================================================
//  @tmcut/core — templates
//  Timeline template engine & built-in catalog (Roadmap J-1).
//  Zero-dependency, pure logic module for creating, instantiating, and
//  managing timeline project templates with placeholders.
// =============================================================================

import { TICKS_PER_SECOND } from './time.mjs'

let templateCounter = 0

function uid(prefix = 'tpl') {
  templateCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${templateCounter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Standard built-in templates ready to use.
 */
export const BUILTIN_TEMPLATES = [
  {
    id: 'tpl-tiktok-hook-intro',
    name: 'TikTok / Reels Hook Intro',
    description: 'Fast-paced viral vertical opener with high-impact headline text and media placeholder.',
    category: 'intro',
    aspectRatio: '9:16',
    canvas: { width: 1080, height: 1920, fps: 30 },
    durationTicks: 3 * TICKS_PER_SECOND, // 3 seconds = 360,000 ticks
    thumbnail: 'i-lucide-smartphone',
    isBuiltin: true,
    createdAt: 1776000000000,
    placeholders: [
      {
        id: 'ph-hook-video',
        type: 'video',
        label: 'Hook Footage (3s)',
        clipId: 'c-hook-video-1',
        trackId: 'tr-video-1',
        required: true
      },
      {
        id: 'ph-hook-headline',
        type: 'text',
        label: 'Catchy Headline Text',
        clipId: 'c-hook-text-1',
        trackId: 'tr-text-1',
        defaultContent: 'STOP SCROLLING! ⚡',
        required: true
      },
      {
        id: 'ph-hook-sfx',
        type: 'audio',
        label: 'Whoosh SFX / Audio',
        clipId: 'c-hook-audio-1',
        trackId: 'tr-audio-1',
        required: false
      }
    ],
    tracks: [
      {
        id: 'tr-text-1',
        type: 'text',
        name: 'Text Overlay',
        items: [
          {
            id: 'c-hook-text-1',
            type: 'text',
            name: 'Headline',
            text: 'STOP SCROLLING! ⚡',
            color: '#ffdd00',
            fontSize: 54,
            fontFamily: 'Outfit',
            bold: true,
            stroke: true,
            shadow: true,
            align: 'center',
            animIn: 'zoom-in',
            animInDuration: 0.35,
            x: 0,
            y: -150,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 3,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-video-1',
        type: 'video',
        name: 'Main Video',
        items: [
          {
            id: 'c-hook-video-1',
            type: 'video',
            name: 'Hook Media Placeholder',
            src: '',
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: 'crop',
            in: 0,
            out: 3,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-audio-1',
        type: 'audio',
        name: 'Audio SFX',
        items: [
          {
            id: 'c-hook-audio-1',
            type: 'audio',
            name: 'Whoosh SFX',
            src: '',
            in: 0,
            out: 3,
            offset: 0,
            speed: 1,
            volume: 90,
            fade: { in: 0, out: TICKS_PER_SECOND * 0.5 },
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-youtube-cinematic-intro',
    name: 'YouTube Cinematic Title',
    description: 'Clean cinematic widescreen intro with smooth fade, elegant typography and ambient atmosphere.',
    category: 'intro',
    aspectRatio: '16:9',
    canvas: { width: 1920, height: 1080, fps: 30 },
    durationTicks: 5 * TICKS_PER_SECOND, // 5 seconds = 600,000 ticks
    thumbnail: 'i-lucide-monitor',
    isBuiltin: true,
    createdAt: 1776000000000,
    placeholders: [
      {
        id: 'ph-cine-video',
        type: 'video',
        label: 'Scenic B-Roll Footage',
        clipId: 'c-cine-video-1',
        trackId: 'tr-cine-video',
        required: true
      },
      {
        id: 'ph-cine-title',
        type: 'text',
        label: 'Cinematic Title',
        clipId: 'c-cine-text-1',
        trackId: 'tr-cine-text',
        defaultContent: 'THE JOURNEY BEGINS',
        required: true
      },
      {
        id: 'ph-cine-bgm',
        type: 'audio',
        label: 'Ambient Intro Music',
        clipId: 'c-cine-audio-1',
        trackId: 'tr-cine-audio',
        required: false
      }
    ],
    tracks: [
      {
        id: 'tr-cine-text',
        type: 'text',
        name: 'Title Text',
        items: [
          {
            id: 'c-cine-text-1',
            type: 'text',
            name: 'Cinematic Title',
            text: 'THE JOURNEY BEGINS',
            color: '#ffffff',
            fontSize: 48,
            fontFamily: 'Inter',
            bold: false,
            shadow: true,
            align: 'center',
            animIn: 'fade',
            animInDuration: 0.8,
            animOut: 'fade',
            animOutDuration: 0.8,
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 5,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-cine-video',
        type: 'video',
        name: 'Background Video',
        items: [
          {
            id: 'c-cine-video-1',
            type: 'video',
            name: 'Scenic B-Roll',
            src: '',
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: 'fit',
            in: 0,
            out: 5,
            offset: 0,
            speed: 1,
            fade: { in: TICKS_PER_SECOND, out: TICKS_PER_SECOND },
            effects: [
              { type: 'vignette', params: { intensity: 0.4 } }
            ],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-cine-audio',
        type: 'audio',
        name: 'Background Music',
        items: [
          {
            id: 'c-cine-audio-1',
            type: 'audio',
            name: 'Ambient Soundtrack',
            src: '',
            in: 0,
            out: 5,
            offset: 0,
            speed: 1,
            volume: 80,
            fade: { in: TICKS_PER_SECOND * 0.5, out: TICKS_PER_SECOND * 0.8 },
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-split-screen-duo',
    name: 'Dual Split-Screen (Top & Bottom)',
    description: 'Two synchronized vertical boxes for reaction videos, comparisons, and dual camera angles.',
    category: 'split-screen',
    aspectRatio: '9:16',
    canvas: { width: 1080, height: 1920, fps: 30 },
    durationTicks: 6 * TICKS_PER_SECOND, // 6 seconds = 720,000 ticks
    thumbnail: 'i-lucide-columns-2',
    isBuiltin: true,
    createdAt: 1776000000000,
    placeholders: [
      {
        id: 'ph-split-top',
        type: 'video',
        label: 'Top Video (Original / Subject)',
        clipId: 'c-split-v1',
        trackId: 'tr-split-top',
        required: true
      },
      {
        id: 'ph-split-bottom',
        type: 'video',
        label: 'Bottom Video (Reaction / Comparison)',
        clipId: 'c-split-v2',
        trackId: 'tr-split-bottom',
        required: true
      },
      {
        id: 'ph-split-badge',
        type: 'text',
        label: 'Center Separator Badge',
        clipId: 'c-split-badge-1',
        trackId: 'tr-split-badge',
        defaultContent: 'VS',
        required: false
      }
    ],
    tracks: [
      {
        id: 'tr-split-badge',
        type: 'text',
        name: 'Divider Badge',
        items: [
          {
            id: 'c-split-badge-1',
            type: 'text',
            name: 'VS Badge',
            text: 'VS',
            color: '#ff2d55',
            fontSize: 40,
            bold: true,
            stroke: true,
            align: 'center',
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 6,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-split-top',
        type: 'video',
        name: 'Top Camera',
        items: [
          {
            id: 'c-split-v1',
            type: 'video',
            name: 'Top Screen Footage',
            src: '',
            x: 0,
            y: -480,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: 'crop',
            cropRect: { x: 0, y: 0.1, w: 1, h: 0.8 },
            in: 0,
            out: 6,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-split-bottom',
        type: 'video',
        name: 'Bottom Camera',
        items: [
          {
            id: 'c-split-v2',
            type: 'video',
            name: 'Bottom Screen Footage',
            src: '',
            x: 0,
            y: 480,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: 'crop',
            cropRect: { x: 0, y: 0.1, w: 1, h: 0.8 },
            in: 0,
            out: 6,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-modern-promo-card',
    name: 'Instagram Square Product Promo',
    description: 'Clean 1:1 square promo card with price tag, headline, and centered product media.',
    category: 'promo',
    aspectRatio: '1:1',
    canvas: { width: 1080, height: 1080, fps: 30 },
    durationTicks: 4 * TICKS_PER_SECOND, // 4 seconds = 480,000 ticks
    thumbnail: 'i-lucide-square',
    isBuiltin: true,
    createdAt: 1776000000000,
    placeholders: [
      {
        id: 'ph-promo-media',
        type: 'image',
        label: 'Product Photo / Video',
        clipId: 'c-promo-media-1',
        trackId: 'tr-promo-media',
        required: true
      },
      {
        id: 'ph-promo-title',
        type: 'text',
        label: 'Promotion Title',
        clipId: 'c-promo-text-1',
        trackId: 'tr-promo-text',
        defaultContent: 'SPECIAL DEAL 50% OFF',
        required: true
      },
      {
        id: 'ph-promo-cta',
        type: 'text',
        label: 'Call to Action',
        clipId: 'c-promo-text-2',
        trackId: 'tr-promo-text',
        defaultContent: 'TAP TO SHOP NOW',
        required: false
      }
    ],
    tracks: [
      {
        id: 'tr-promo-text',
        type: 'text',
        name: 'Promo Overlay',
        items: [
          {
            id: 'c-promo-text-1',
            type: 'text',
            name: 'Special Deal',
            text: 'SPECIAL DEAL 50% OFF',
            color: '#ffffff',
            fontSize: 42,
            bold: true,
            shadow: true,
            align: 'center',
            animIn: 'slide-up',
            animInDuration: 0.4,
            x: 0,
            y: -360,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          },
          {
            id: 'c-promo-text-2',
            type: 'text',
            name: 'Call to Action',
            text: 'TAP TO SHOP NOW',
            color: '#00ffcc',
            fontSize: 28,
            bold: true,
            shadow: true,
            align: 'center',
            animIn: 'fade',
            animInDuration: 0.5,
            x: 0,
            y: 380,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0.5,
            out: 4,
            offset: 0.5,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-promo-media',
        type: 'video',
        name: 'Product Showcase',
        items: [
          {
            id: 'c-promo-media-1',
            type: 'video',
            name: 'Product Media',
            src: '',
            x: 0,
            y: 10,
            scale: 90,
            opacity: 100,
            rotation: 0,
            fit: 'fit',
            in: 0,
            out: 4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-outro-social-end',
    name: 'YouTube Outro & Subscribe Card',
    description: 'Widescreen outro screen prompting viewers to like, subscribe and check next video.',
    category: 'outro',
    aspectRatio: '16:9',
    canvas: { width: 1920, height: 1080, fps: 30 },
    durationTicks: 6 * TICKS_PER_SECOND, // 6 seconds = 720,000 ticks
    thumbnail: 'i-lucide-share-2',
    isBuiltin: true,
    createdAt: 1776000000000,
    placeholders: [
      {
        id: 'ph-outro-video',
        type: 'video',
        label: 'Outro Loop / Background Video',
        clipId: 'c-outro-video-1',
        trackId: 'tr-outro-bg',
        required: false
      },
      {
        id: 'ph-outro-thanks',
        type: 'text',
        label: 'Thank You Message',
        clipId: 'c-outro-text-1',
        trackId: 'tr-outro-text',
        defaultContent: 'THANKS FOR WATCHING!',
        required: true
      },
      {
        id: 'ph-outro-sub',
        type: 'text',
        label: 'Subscribe Text',
        clipId: 'c-outro-text-2',
        trackId: 'tr-outro-text',
        defaultContent: 'LIKE & SUBSCRIBE FOR MORE',
        required: false
      }
    ],
    tracks: [
      {
        id: 'tr-outro-text',
        type: 'text',
        name: 'Outro Titles',
        items: [
          {
            id: 'c-outro-text-1',
            type: 'text',
            name: 'Thanks Message',
            text: 'THANKS FOR WATCHING!',
            color: '#ffffff',
            fontSize: 46,
            bold: true,
            shadow: true,
            align: 'center',
            animIn: 'zoom-in',
            animInDuration: 0.5,
            x: 0,
            y: -220,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 6,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          },
          {
            id: 'c-outro-text-2',
            type: 'text',
            name: 'Subscribe Call',
            text: 'LIKE & SUBSCRIBE FOR MORE',
            color: '#ff3b30',
            fontSize: 30,
            bold: true,
            shadow: true,
            align: 'center',
            animIn: 'slide-up',
            animInDuration: 0.5,
            x: 0,
            y: 260,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0.8,
            out: 6,
            offset: 0.8,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-outro-bg',
        type: 'video',
        name: 'Outro Background',
        items: [
          {
            id: 'c-outro-video-1',
            type: 'video',
            name: 'Outro Ambient BG',
            src: '',
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: 'cover',
            in: 0,
            out: 6,
            offset: 0,
            speed: 1,
            effects: [
              { type: 'blur', params: { radius: 10 } }
            ],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-minimal-vlog-lowerthird',
    name: 'Minimal Vlog & Lower Third',
    description: 'Clean modern documentary overlay with lower-third speaker credit and location tag.',
    category: 'minimal',
    aspectRatio: '16:9',
    canvas: { width: 1920, height: 1080, fps: 30 },
    durationTicks: 5 * TICKS_PER_SECOND, // 5 seconds = 600,000 ticks
    thumbnail: 'i-lucide-subtitles',
    isBuiltin: true,
    createdAt: 1776000000000,
    placeholders: [
      {
        id: 'ph-vlog-footage',
        type: 'video',
        label: 'Interview / Vlog Video',
        clipId: 'c-vlog-video-1',
        trackId: 'tr-vlog-footage',
        required: true
      },
      {
        id: 'ph-vlog-speaker',
        type: 'text',
        label: 'Speaker Name & Role',
        clipId: 'c-vlog-text-1',
        trackId: 'tr-vlog-titles',
        defaultContent: 'ALEX RIVERA · TRAVEL JOURNALIST',
        required: true
      }
    ],
    tracks: [
      {
        id: 'tr-vlog-titles',
        type: 'text',
        name: 'Lower Third Titles',
        items: [
          {
            id: 'c-vlog-text-1',
            type: 'text',
            name: 'Speaker Tag',
            text: 'ALEX RIVERA · TRAVEL JOURNALIST',
            color: '#ffffff',
            fontSize: 26,
            fontFamily: 'Inter',
            bold: true,
            shadow: true,
            align: 'left',
            animIn: 'slide-right',
            animInDuration: 0.45,
            animOut: 'fade',
            animOutDuration: 0.4,
            x: -420,
            y: 380,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0.5,
            out: 4.5,
            offset: 0.5,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: 'tr-vlog-footage',
        type: 'video',
        name: 'Main Footage',
        items: [
          {
            id: 'c-vlog-video-1',
            type: 'video',
            name: 'Vlog Interview',
            src: '',
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: 'fit',
            in: 0,
            out: 5,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  }
]

/**
 * Returns a deep copy of built-in templates.
 */
export function getBuiltinTemplates() {
  return deepClone(BUILTIN_TEMPLATES)
}

/**
 * Finds a template by its ID in a given list or builtins.
 */
export function getTemplateById(templates, id) {
  const list = Array.isArray(templates) ? templates : BUILTIN_TEMPLATES
  return list.find(t => t && t.id === id) ?? null
}

/**
 * Validates whether an object matches the TmcutTemplate contract.
 */
export function validateTemplate(template) {
  const errors = []
  if (!template || typeof template !== 'object') {
    return { valid: false, errors: ['Template must be an object'] }
  }
  if (!template.id || typeof template.id !== 'string') {
    errors.push('Missing or invalid template id')
  }
  if (!template.name || typeof template.name !== 'string' || !template.name.trim()) {
    errors.push('Missing or empty template name')
  }
  if (!template.canvas || typeof template.canvas !== 'object') {
    errors.push('Missing template canvas')
  } else {
    if (!Number.isFinite(template.canvas.width) || template.canvas.width <= 0) {
      errors.push('Invalid canvas width')
    }
    if (!Number.isFinite(template.canvas.height) || template.canvas.height <= 0) {
      errors.push('Invalid canvas height')
    }
  }
  if (!Number.isFinite(template.durationTicks) || template.durationTicks <= 0) {
    errors.push('Invalid template durationTicks')
  }
  if (!Array.isArray(template.tracks)) {
    errors.push('Template tracks must be an array')
  }
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Filters templates by category, aspect ratio, and search query.
 */
export function filterTemplates(templates, options = {}) {
  const list = Array.isArray(templates) ? templates : BUILTIN_TEMPLATES
  const { category, aspectRatio, search } = options

  return list.filter((tpl) => {
    if (!tpl) return false
    if (category && category !== 'all' && tpl.category !== category) {
      return false
    }
    if (aspectRatio && aspectRatio !== 'all' && tpl.aspectRatio !== aspectRatio) {
      return false
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase()
      const matchName = (tpl.name || '').toLowerCase().includes(q)
      const matchDesc = (tpl.description || '').toLowerCase().includes(q)
      if (!matchName && !matchDesc) return false
    }
    return true
  })
}

/**
 * Creates a template snapshot from an existing timeline.
 */
export function createTemplateFromTimeline(timeline, meta = {}) {
  const tracks = deepClone(timeline?.tracks || [])
  const markers = deepClone(timeline?.markers || [])

  let maxEndSec = 0
  const placeholders = []

  // Collect clips and auto-generate placeholders
  tracks.forEach((track, trkIdx) => {
    track.id = track.id || `tr-${trkIdx + 1}`
    if (Array.isArray(track.items)) {
      track.items.forEach((item, itemIdx) => {
        const itemEnd = (item.offset ?? 0) + ((item.out ?? 5) - (item.in ?? 0)) / (item.speed || 1)
        if (itemEnd > maxEndSec) maxEndSec = itemEnd

        placeholders.push({
          id: `ph-${track.type}-${trkIdx + 1}-${itemIdx + 1}`,
          type: track.type === 'text' ? 'text' : track.type === 'audio' ? 'audio' : 'video',
          label: item.name || item.text || `Item ${itemIdx + 1}`,
          clipId: item.id,
          trackId: track.id,
          defaultContent: item.text,
          required: false
        })
      })
    }
  })

  const durationTicks = Math.max(TICKS_PER_SECOND, Math.round(maxEndSec * TICKS_PER_SECOND))

  const template = {
    id: meta.id || uid('usr_tpl'),
    name: meta.name || 'Custom Template',
    description: meta.description || '',
    category: meta.category || 'custom',
    aspectRatio: meta.aspectRatio || '16:9',
    canvas: meta.canvas ? deepClone(meta.canvas) : { width: 1920, height: 1080, fps: 30 },
    durationTicks,
    thumbnail: meta.thumbnail || 'i-lucide-layout-template',
    tracks,
    markers,
    placeholders: meta.placeholders || placeholders,
    createdAt: meta.createdAt || Date.now(),
    isBuiltin: false
  }

  return template
}

/**
 * Instantiates a template into a fresh timeline with unique IDs and optional placeholder replacements.
 *
 * @param {object} template - The template definition
 * @param {object} [options] - Options containing optional replacements: { [placeholderId]: { src, text, name } }
 * @returns {object} { canvas, timeline, durationMs }
 */
export function instantiateTemplate(template, options = {}) {
  const cloned = deepClone(template)
  const replacements = options.replacements || {}

  // Map old clip IDs to placeholder mappings
  const placeholderByClipId = new Map()
  if (Array.isArray(cloned.placeholders)) {
    for (const ph of cloned.placeholders) {
      if (ph.clipId) {
        placeholderByClipId.set(ph.clipId, ph)
      }
    }
  }

  const tracks = (cloned.tracks || []).map((track, trkIdx) => {
    const newTrackId = `t-${track.type || 'track'}-${trkIdx + 1}-${Math.random().toString(36).slice(2, 6)}`
    const items = (track.items || []).map((item) => {
      const newClipId = `clip_${Math.random().toString(36).slice(2, 10)}`
      const newItem = { ...item, id: newClipId }

      // Check if this clip was associated with a placeholder
      const ph = placeholderByClipId.get(item.id)
      if (ph && replacements[ph.id]) {
        const rep = replacements[ph.id]
        if (rep.src !== undefined) newItem.src = rep.src
        if (rep.text !== undefined) newItem.text = rep.text
        if (rep.name !== undefined) newItem.name = rep.name
      }

      return newItem
    })

    return {
      ...track,
      id: newTrackId,
      items
    }
  })

  const durationSec = cloned.durationTicks / TICKS_PER_SECOND
  const durationMs = Math.round(durationSec * 1000)

  return {
    canvas: cloned.canvas,
    timeline: {
      version: 1,
      tracks,
      durationMs,
      markers: cloned.markers || []
    },
    durationMs
  }
}

/**
 * Replaces a placeholder clip in a timeline with new media or text.
 */
export function replacePlaceholder(timeline, clipId, replacement = {}) {
  if (!timeline || !Array.isArray(timeline.tracks)) return false

  let modified = false
  for (const track of timeline.tracks) {
    if (!Array.isArray(track.items)) continue
    for (const item of track.items) {
      if (item && item.id === clipId) {
        if (replacement.src !== undefined) item.src = replacement.src
        if (replacement.text !== undefined) item.text = replacement.text
        if (replacement.name !== undefined) item.name = replacement.name
        if (replacement.thumbPath !== undefined) item.thumbPath = replacement.thumbPath
        modified = true
        break
      }
    }
    if (modified) break
  }
  return modified
}
