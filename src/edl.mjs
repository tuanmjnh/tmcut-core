// =============================================================================
//  @tmcut/core — edl
//  Edit Decision List validation (docs sections 38-40, 66). The EDL is the
//  contract between media analysis / AI and the timeline: validate before
//  any apply step, never trust model output shape.
// =============================================================================

const PROFILES = ['viral-shorts', 'podcast-summary', 'cinematic-vlog']

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Validate an EDL object. Returns an array of human-readable errors
 * (empty = valid).
 */
export function validateEdl(edl) {
  const errors = []
  if (!edl || typeof edl !== 'object') return ['edl must be an object']
  if (edl.version !== 1) errors.push(`unsupported edl version: ${edl.version}`)
  if (typeof edl.assetId !== 'string' || edl.assetId.length === 0) {
    errors.push('edl.assetId must be a non-empty string')
  }
  if (!PROFILES.includes(edl.profile)) {
    errors.push(`unknown edl profile: ${edl.profile}`)
  }
  if (!Array.isArray(edl.segments)) return [...errors, 'edl.segments must be an array']
  edl.segments.forEach((segment, index) => {
    const at = `segment ${index}`
    if (!segment || typeof segment !== 'object') {
      errors.push(`${at} must be an object`)
      return
    }
    if (!isFiniteNumber(segment.start) || segment.start < 0) {
      errors.push(`${at} has invalid start`)
    }
    if (!isFiniteNumber(segment.end) || !(segment.end > segment.start)) {
      errors.push(`${at} has invalid end`)
    }
    if (!isFiniteNumber(segment.score) || segment.score < 0 || segment.score > 1) {
      errors.push(`${at} score must be within 0..1`)
    }
    if (typeof segment.reason !== 'string' || segment.reason.length === 0) {
      errors.push(`${at} needs a reason`)
    }
    if (segment.thumb !== undefined && (!isFiniteNumber(segment.thumb) || segment.thumb < segment.start || segment.thumb > segment.end)) {
      errors.push(`${at} thumb must fall inside [start, end]`)
    }
  })
  return errors
}

/** Keep segments at/above a score threshold, sorted by start time. */
export function selectSegments(edl, minScore = 0.5) {
  if (!edl || !Array.isArray(edl.segments)) return []
  return edl.segments
    .filter(segment => isFiniteNumber(segment.score) && segment.score >= minScore)
    .slice()
    .sort((a, b) => a.start - b.start)
}
