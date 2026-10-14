// @tmcut/core — public API declarations.
// Types come from ../types/ (single source of truth); this file only binds
// them to the runtime engine's function signatures. Checked by
// tsconfig.check.json (pnpm typecheck:core), not by ESLint.
import type {
  FrameRate,
  TmcutTrackType,
  TmcutTimelineClip,
  TmcutClipEffect,
  TmcutTrack,
  TmcutMarker,
  TmcutTimeline,
  TmcutProject,
  TmcutCanvas,
  TmcutFitMode,
  TmcutOrientation,
  TmcutCropRect,
  TmcutTextAnimationType,
  TmcutStabilizeLevel,
  TmcutStabilizeStatus,
  MediaTime
} from '../types/dsl.js'
import type { TmcutAssetKind, TmcutMediaMetadata } from '../types/media.js'
import type { TmcutEdl, TmcutEdlSegment } from '../types/edl.js'
import type { TranscriptCue } from '../types/caption.js'

// Re-exported domain types for consumers (single import site).
export type {
  FrameRate,
  TmcutTrackType,
  TmcutTimelineClip,
  TmcutClipEffect,
  TmcutTrack,
  TmcutMarker,
  TmcutTimeline,
  TmcutProject,
  TmcutCanvas,
  TmcutFitMode,
  TmcutOrientation,
  TmcutCropRect,
  TmcutTextAnimationType,
  TmcutStabilizeLevel,
  TmcutStabilizeStatus,
  MediaTime
} from '../types/dsl.js'
export type { TmcutAssetKind } from '../types/media.js'
export type { TmcutEdl, TmcutEdlSegment } from '../types/edl.js'

export type CoreTrackType = 'video' | 'text' | 'audio'
export type CoreAssetKind = 'video' | 'audio' | 'image'

export interface CoreClipInput extends Partial<TmcutTimelineClip> {
  src?: string
  in?: number
  out?: number
  offset?: number
  scale?: number
  opacity?: number
  x?: number
  y?: number
  rotation?: number
}

export interface CoreHistoryCommand {
  name?: string
  label?: string
  before: TmcutTimeline
  after: TmcutTimeline
}

export interface CoreHistory {
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly depth: number
  commit(command: CoreHistoryCommand): void
  undo(): TmcutTimeline | null
  redo(): TmcutTimeline | null
  clear(): void
  /** Internal: the top entry (or null) — used by coalesce (docs C15). */
  _top(): { name: string, label: string, createdAt: string } | null
  /** Internal: replace the top entry's after-state and clear redo. */
  _replaceAfter(after: TmcutTimeline): void
}

export interface CoreClipboard {
  version: 1
  baseStart: number
  clips: Array<{ trackType: CoreTrackType, clip: TmcutTimelineClip }>
}

export type CoreRecoveryDecision = 'none' | 'suggest' | 'force'

export interface CoreRecoveryInput {
  hasRecovery: boolean
  recoveryUpdatedAtMs: number | null
  hasProject: boolean
  projectMtimeMs: number
}

export interface CoreAssetRecord {
  id: string
  kind: CoreAssetKind
  name: string
  status: string
  sourceType: string
  locator: { runtime: string, path?: string, url?: string }
  durationSec: number
  width: number
  height: number
  fps: number
  fileSize: number
  hash: string | null
  [key: string]: unknown
}

export interface CoreV1TrackItem {
  id: string
  [key: string]: unknown
}

export interface CoreV1Track {
  id: string
  type: CoreTrackType
  name?: string
  items: CoreV1TrackItem[]
}

export interface CoreV3SyncStats {
  added: number
  updated: number
  removed: number
}

export interface CoreSceneSegment {
  start: number
  end: number
}

export interface CoreSilenceRange {
  start: number
  end: number
}

export interface CoreSpeechRange {
  start: number
  end: number
}

export const TICKS_PER_SECOND: number
export function secToTicks(seconds: number): number
export function ticksToSec(ticks: number): number
export const KNOWN_FRAME_RATES: FrameRate[]
export function fpsToRational(fps: number): FrameRate
export function rationalToFloat(rate: FrameRate): number
export function ticksPerFrame(rate: FrameRate): number
export function snapToFrame(ticks: number, rate: FrameRate): number
export function ticksToFrames(ticks: number, rate: FrameRate): number
export function formatTimecode(ticks: number, rate: FrameRate): string

export function clipDurationTicks(clip: TmcutTimelineClip): number
export function clipEndTicks(clip: TmcutTimelineClip): number
export function totalDurationTicks(timeline: TmcutTimeline): number
export function findClip(timeline: TmcutTimeline, clipId: string): { track: TmcutTrack, index: number, clip: TmcutTimelineClip } | null
export function findTrack(timeline: TmcutTimeline, trackId: string): TmcutTrack | null
export function ensureTrack(timeline: TmcutTimeline, trackType: CoreTrackType, name?: string): TmcutTrack
export function nextTrackName(timeline: TmcutTimeline, trackType: CoreTrackType): string
export function addTrack(timeline: TmcutTimeline, trackType: CoreTrackType, name?: string): TmcutTrack
export function removeTrack(timeline: TmcutTimeline, trackId: string, options?: { keepClips?: boolean }): boolean
export function addClip(timeline: TmcutTimeline, trackType: CoreTrackType, partial?: CoreClipInput): TmcutTimelineClip | null
export function removeClip(timeline: TmcutTimeline, clipId: string): boolean
export function splitClip(timeline: TmcutTimeline, clipId: string, splitTimeTicks: number): TmcutTimelineClip | null
export function moveClip(timeline: TmcutTimeline, clipId: string, startTicks: number): boolean
export function trimClip(timeline: TmcutTimeline, clipId: string, edge: 'in' | 'out', sourceTicks: number): boolean
export function validateTimeline(timeline: unknown): string[]

export function createHistory(limit?: number): CoreHistory
export function pushBatch(history: CoreHistory, entries: CoreHistoryCommand[], label?: string): void
export function coalesce(history: CoreHistory, entry: CoreHistoryCommand, windowMs?: number): boolean

export function assetIdForPath(path: unknown): string
export function defaultCanvas(width?: number, height?: number, fps?: number): TmcutCanvas
export function defaultTimeline(): TmcutTimeline
export function createProject(name?: string, canvas?: TmcutCanvas): TmcutProject
export function migrateV1ToV3(v1: unknown): TmcutProject

export function normalizeMediaPath(input: unknown): string
export function mediaFileKey(input: unknown): string
export function mediaFileName(input: unknown): string
export function extensionOf(input: unknown): string
export function classifyAssetKind(input: unknown): TmcutAssetKind | null
export function formatDurationSec(sec: unknown): string
export function formatFileSize(bytes: unknown): string

export function decideRecovery(input: CoreRecoveryInput): CoreRecoveryDecision

export function int16ToPeaks(samples: ArrayLike<number> | null | undefined, buckets?: number): number[]
export function clampWaveformPoints(points: unknown): number[]

export function fnv1aHex(text: string): string
export function cacheKeyForPath(path: string, revision?: { mtimeMs?: number, size?: number }): string
export function cachePathFor(cacheDir: string, kind: string, key: string, extension: string): string

export interface ProxyOptions {
  width?: number
  crf?: number
  fps?: number
}
export function buildProxyArgs(input: string, output: string, options?: number | ProxyOptions): string[]

export function validateEdl(edl: unknown): string[]
export function selectSegments(edl: TmcutEdl, minScore?: number): TmcutEdlSegment[]
/** EDL segments (seconds) -> tick clip inputs; an invalid EDL yields []. */
export function segmentsToClips(
  edl: TmcutEdl,
  segments: TmcutEdlSegment[],
  options?: {
    /** Preserve source pauses >= this many ticks; smaller gaps close. */
    minGapTicks?: number
    /** Guards intent for future audio EDLs; clip shape is identical today. */
    trackType?: 'video' | 'audio'
  }
): Array<CoreClipInput & { in: number, out: number, offset: number }>

// --- Caption / SRT (Roadmap C11) ---
// Cue times are SECONDS (Whisper/SRT native); clip times are v3 ticks.
export type { TranscriptCue } from '../types/caption.js'
export function splitLongCue(cue: TranscriptCue, maxChars: number): TranscriptCue[]
export function cuesToCaptionClips(
  cues: TranscriptCue[],
  options?: {
    /** Word-split budget per caption line (default 42). */
    maxChars?: number
    /** On-screen budget in ticks; longer cues time-slice evenly (default 7s). */
    maxDurTicks?: number
    /** Anchor added to every caption offset (e.g. clip timeline position). */
    fromTicks?: number
    /** Source window in ticks: outside cues drop, straddling cues trim. */
    rangeTicks?: { start: number, end: number }
  }
): Array<CoreClipInput & { text: string, in: number, out: number, offset: number }>
export function parseSrt(text: string): TranscriptCue[]
export function serializeSrt(cues: TranscriptCue[]): string

// --- Audio fades + gain math (Roadmap C12) ---
// Clips accept three shapes (same dual-shape contract as evalKeyframe):
//  - a full v3 timeline clip;
//  - a SHAPE-SHORTCUT `{ timeline: { duration } }` — enough for the fade
//    math (C16-R3: the ticks store hands duration explicitly so the
//    legacy flat branch never sees tick values);
//  - the legacy v1 flat item (in/out SECONDS) — file-migration hosts only.
export type TmcutClipFadeEdge = 'in' | 'out'
export type CoreFadeClip = TmcutTimelineClip | {
  timeline: { start?: number, duration: number }
  speed?: number
  volume?: number
  fade?: { in: number, out: number }
} | {
  /** Legacy v1 flat item: source range in SECONDS. */
  in: number
  out: number
  speed?: number
  volume?: number
  fade?: { in: number, out: number }
} | null | undefined
export function fadeDuration(clip: CoreFadeClip, edge: TmcutClipFadeEdge): number
export function gainAt(clip: CoreFadeClip, atTicks: number): number
export function volumeExpr(clip: CoreFadeClip): string

// --- Frame plan: filmstrip / thumbnail timestamps (Roadmap C14) ---
// Core maths tick lists only; FFmpeg -ss stays in the Electron extractor.
export function filmstripTimes(startTicks: number, durationTicks: number, count: number): number[]
export function frameTimesForSegments(
  segments: Array<TmcutTimelineClip | {
    /** Legacy v1 flat item: offset/in/out in SECONDS. */
    id: string | number
    offset: number
    in: number
    out: number
    speed?: number
  }>,
  perSegment: number
): Array<{ id: string | number, times: number[] }>
export function clampFrameTime(atTicks: number, startTicks: number, durationTicks: number): number

export function createSelection(ids?: Array<string | unknown>): string[]
export function toggleSelected(selection: string[], id: string): string[]
export function selectAllClips(timeline: TmcutTimeline): string[]
export function selectTrackClips(timeline: TmcutTimeline, trackId: string): string[]
export function expandRelated(timeline: TmcutTimeline, ids: string[]): string[]
export function groupClips(timeline: TmcutTimeline, ids: string[]): string | null
export function ungroupClips(timeline: TmcutTimeline, ids: string[]): number
export function resolveClips(timeline: TmcutTimeline, ids: string[]): Array<{ track: TmcutTrack, index: number, clip: TmcutTimelineClip }>

export function addMarker(timeline: TmcutTimeline, atTicks: number, options?: { id?: string, label?: string, color?: string }): TmcutMarker
export function removeMarker(timeline: TmcutTimeline, markerId: string): boolean
export function moveMarker(timeline: TmcutTimeline, markerId: string, atTicks: number): boolean
export function markersInRange(timeline: TmcutTimeline, fromTicks: number, toTicks: number): TmcutMarker[]

export function moveClips(timeline: TmcutTimeline, ids: string[], deltaTicks: number): { moved: number, skippedLocked: number }
export function duplicateClips(timeline: TmcutTimeline, ids: string[], atTicks?: number): TmcutTimelineClip[]
export function copyClips(timeline: TmcutTimeline, ids: string[]): CoreClipboard | null
export function pasteClips(timeline: TmcutTimeline, clipboard: CoreClipboard, atTicks: number): string[]
export function rippleDelete(timeline: TmcutTimeline, clipId: string, options?: { acrossTracks?: boolean }): number | null
export function insertClipRipple(timeline: TmcutTimeline, trackType: TmcutTrackType, partial: Partial<TmcutTimelineClip>, atTicks: number, options?: { acrossTracks?: boolean }): { clip: TmcutTimelineClip, shifted: number } | null
export function closeGaps(timeline: TmcutTimeline, options?: { acrossTracks?: boolean, trackType?: TmcutTrackType }): number
export function snapTime(timeline: TmcutTimeline, targetTicks: number, options?: { thresholdTicks?: number, playheadTicks?: number, ignoreIds?: string[] }): number
export function snapTimeDetailed(timeline: TmcutTimeline, targetTicks: number, options?: { thresholdTicks?: number, playheadTicks?: number, ignoreIds?: string[] }): {
  ticks: number
  snapped: { ticks: number, kind: 'zero' | 'playhead' | 'clip-start' | 'clip-end' | 'marker', fromId?: string } | null
}

export function registerAsset(registry: CoreAssetRecord[], input?: Partial<CoreAssetRecord> & { path?: string }): CoreAssetRecord
export function getAsset(registry: CoreAssetRecord[], id: string): CoreAssetRecord | null
export function findAssetByPath(registry: CoreAssetRecord[], path: unknown): CoreAssetRecord | null
export function attachMetadata(registry: CoreAssetRecord[], id: string, metadata?: Partial<CoreAssetRecord>): boolean
export function relinkAsset(registry: CoreAssetRecord[], id: string, locator: CoreAssetRecord['locator']): CoreAssetRecord | null
export function removeAsset(registry: CoreAssetRecord[], id: string): boolean
export function listAssets(registry: CoreAssetRecord[], kind?: CoreAssetKind): CoreAssetRecord[]

export function parseFrameRate(raw: unknown): number
export function normalizeProbe(payload: unknown): TmcutMediaMetadata | null

export function v1ClipToV3(item: CoreV1TrackItem, trackType: CoreTrackType): TmcutTimelineClip
export function v1TracksToV3(tracks: CoreV1Track[]): TmcutTimeline
export function v3ClipToV1(clip: TmcutTimelineClip): CoreV1TrackItem
export function v1MatchesV3(item: CoreV1TrackItem, clip: TmcutTimelineClip): boolean
export function syncV3Result(v1Tracks: CoreV1Track[], afterV3: TmcutTimeline): CoreV3SyncStats

/**
 * C16-R3 ticks-native bridge (the live-store path). Same structural rules
 * as the seconds bridge above, but the flat item's `in`/`out`/`offset`
 * are integer TICKS — so the per-edit conversion is a lossless identity
 * on time fields. The seconds versions remain for FILE MIGRATION only.
 */
export function ticksClipToV3(item: CoreV1TrackItem, trackType: CoreTrackType): TmcutTimelineClip
export function ticksTracksToV3(tracks: CoreV1Track[]): TmcutTimeline
export function v3ClipToTicks(clip: TmcutTimelineClip): CoreV1TrackItem
export function ticksMatchesV3(item: CoreV1TrackItem, clip: TmcutTimelineClip): boolean
export function syncTicksResult(v1Tracks: CoreV1Track[], afterV3: TmcutTimeline): CoreV3SyncStats

export function parseSceneOutput(stderrText: unknown, durationSec: number): CoreSceneSegment[]
export function parseSilenceOutput(stderrText: unknown, durationSec: number): CoreSilenceRange[]
export function overlapDuration(start: number, end: number, ranges?: Array<{ start: number, end: number }>): number
export interface CoreTranscriptItem {
  start: number
  end: number
  text?: string
}

export const DEFAULT_FILLER_WORDS: string[]

export function detectFillerWords(text: unknown, options?: { customWords?: string[] }): {
  count: number
  words: string[]
  fillerRatio: number
}

export function analyzeTranscriptSegment(text: unknown, options?: {
  filterFillerWords?: boolean
  keywords?: string[]
  customFillerWords?: string[]
}): {
  isFiller: boolean
  isHighlight: boolean
  scoreModifier: number
  matchedKeywords: string[]
  detectedFillers: string[]
}

export function scoreSegments(input: {
  scenes?: CoreSceneSegment[]
  silences?: CoreSilenceRange[]
  speech?: CoreSpeechRange[]
  transcript?: CoreTranscriptItem[]
  profile?: string
  assetId?: string
  analyzerVersion?: string
  filterFillerWords?: boolean
  keywords?: string[]
  customFillerWords?: string[]
}): TmcutEdl

export interface TmcutCanvasPresetDef {
  id: string
  width: number
  height: number
  orientation: TmcutOrientation
  icon: string
}

export interface TmcutSocialPresetDef {
  id: string
  presetId: string
  icon: string
}

export const TMUTCANVAS_PRESETS: TmcutCanvasPresetDef[]
export const TMUTCUT_SOCIAL_PRESETS: TmcutSocialPresetDef[]
export const TMUTCUT_FIT_MODES: TmcutFitMode[]

export function aspectValue(width: number, height: number): number
export function orientationOf(width: number, height: number): TmcutOrientation
export function findCanvasPreset(id: string): TmcutCanvasPresetDef | null
export function findCanvasPresetByDimensions(width: number, height: number): TmcutCanvasPresetDef | null
export function ratioIdOf(width: number, height: number): string
export function ratioLabel(width: number, height: number): string
export function normalizeCanvas(canvas: unknown): TmcutCanvas
export function computeFitObjectStyle(mode: string, focusX?: number, focusY?: number, cropRect?: { x: number, y: number, w: number, h: number }): { objectFit: 'contain' | 'cover' | 'fill', objectPosition: string }
export function buildFfmpegFitFilters(mode: string, canvasW: number, canvasH: number, options?: { focusX?: number, focusY?: number, cropRect?: { x: number, y: number, w: number, h: number }, padColor?: string, rotation?: number }): string[]

export interface TmcutFfmpegTransform {
  /** Standalone background source chain (`color=...`) — label it yourself. */
  bg: string
  /** Appends to the clip's own filter chain (`scale=W:H`). */
  tail: string
  /** Joins the two labeled inputs (`overlay=x=..:y=..:shortest=1`). */
  overlay: string
}

export function buildFfmpegTransform(options?: {
  canvasW: number
  canvasH: number
  scale?: number
  x?: number
  y?: number
  scaleExpr?: string | null
  xExpr?: string | null
  yExpr?: string | null
  fps?: number
  duration?: number
  bgColor?: string
  /** Phase 4: pre-labeled background stream (e.g. `[v_bg]`) used instead of the inline `color=` source — for image backgrounds. */
  bgInput?: string
}): TmcutFfmpegTransform | null
export function reframeTransform(x: number, y: number, fromW: number, fromH: number, toW: number, toH: number): { x: number, y: number }
export function previewScale(containerWidth: number, canvasWidth: number): number

// --- Safe areas + frame guides (Roadmap C13) ---
export interface TmcutSafeRect {
  /** centered fractions of the frame (0..1) */
  x: number
  y: number
  w: number
  h: number
}
export function safeAreaRects(canvas: { width?: number, height?: number } | null | undefined): {
  actionSafe: TmcutSafeRect
  titleSafe: TmcutSafeRect
}
export const SAFE_AREA_PRESETS: Array<{ id: string, label: string, ratio: number }>

// --- Canvas Crop & Mask (Roadmap F-3) ---
export interface TmcutCropRatioPreset {
  id: string
  label: string
  ratio: number | null
}
export const CROP_RATIO_PRESETS: TmcutCropRatioPreset[]
export function clampCropRect(rect: unknown, minSize?: number): TmcutCropRect
export function applyCropRatio(rect: unknown, ratio: number | null | undefined, sourceW?: number, sourceH?: number): TmcutCropRect

// --- Canvas Background (Phase 4) ---
export interface TmcutBackgroundOptions {
  canvasW: number
  canvasH: number
  fps: number
  duration: number
  background: { type: 'color' | 'image' | 'transparent', value?: string }
}
/** Self-contained `color=` source chain; append your own stream label. */
export interface TmcutBackgroundSourceDescriptor {
  type: 'color' | 'transparent'
  kind: 'source'
  chain: string
}
/** Image background: an FFmpeg INPUT (`-framerate <fps> -loop 1 -t <d> -i file`); apply `tail` to the labeled stream. */
export interface TmcutBackgroundImageDescriptor {
  type: 'image'
  kind: 'input'
  file: string
  inputFlags: string[]
  tail: string
}
export type TmcutBackgroundDescriptor = TmcutBackgroundSourceDescriptor | TmcutBackgroundImageDescriptor
export function buildBackgroundSource(options: TmcutBackgroundOptions): TmcutBackgroundDescriptor

// --- Keyframes (Roadmap C3) ---
export type TmcutKeyframeEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step'

/** All supported keyframe easings (Roadmap C3). */
export const KEYFRAME_EASINGS: TmcutKeyframeEasing[]

export interface TmcutKeyframe {
  /** Timeline ticks (TICKS_PER_SECOND =120000). */
  t: number
  /** Animated property name (e.g. 'scale', 'x', 'y', 'opacity', 'volume'). */
  prop: string
  value: number
  /** Segment FROM this keyframe to the next one. Default 'linear'. */
  easing?: TmcutKeyframeEasing
}

export function evalKeyframe(clip: { keyframes?: TmcutKeyframe[] } | null | undefined, prop: string, atTicks: number): number | undefined
export function keyframeAt(clip: { keyframes?: TmcutKeyframe[] } | null | undefined, prop: string, atTicks: number, toleranceTicks?: number): TmcutKeyframe | null
export function setKeyframe(clip: { keyframes?: TmcutKeyframe[] } | null | undefined, prop: string, atTicks: number, value: number, easing?: TmcutKeyframeEasing): TmcutKeyframe | null
export function removeKeyframe(clip: { keyframes?: TmcutKeyframe[] } | null | undefined, prop: string, atTicks: number, toleranceTicks?: number): boolean
export function propsWithKeyframes(clip: { keyframes?: TmcutKeyframe[] } | null | undefined): string[]
export function keyframeTimes(clip: { keyframes?: TmcutKeyframe[] } | null | undefined, prop: string): number[]
export function keyframeExpr(clip: { keyframes?: TmcutKeyframe[] } | null | undefined, prop: string, timeVar?: string): string | null

// --- Transitions: overlap model (Roadmap C5) ---
// `transitionIn.duration` is TIMELINE TICKS (120000/s); applying shifts the
// clip left by that amount so its head overlaps the neighbor's tail.
export type TmcutTransitionReason = 'no-neighbor' | 'gap' | 'too-long' | 'unknown-type' | 'locked'

export interface TmcutTransitionCheck {
  ok: boolean
  reason?: TmcutTransitionReason
  /** Echoes the requested duration when ok. */
  overlapTicks?: number
}

export interface TmcutTransitionWindow {
  fromId: string
  toId: string
  startTicks: number
  endTicks: number
}

export const KNOWN_TRANSITIONS: string[]
export function canApplyTransition(timeline: TmcutTimeline, clipId: string, type: string, durationTicks: number): TmcutTransitionCheck
export function applyTransition(timeline: TmcutTimeline, clipId: string, type: string, durationTicks: number): boolean
export function clearTransition(timeline: TmcutTimeline, clipId: string): boolean
export function transitionWindows(track: TmcutTrack): TmcutTransitionWindow[]

// --- Retime: speed/reverse time map (Roadmap C4) ---
// All clip fields and arguments are in TIMELINE TICKS (120000/s).
export function validateSpeed(speed?: number): number
export function isRetimed(clip: { speed?: number, reverse?: boolean } | null | undefined): boolean
export function timelineToSource(clip: { in?: number, out?: number, speed?: number, reverse?: boolean } | null | undefined, atTicks: number): number
export function sourceToTimeline(clip: { in?: number, out?: number, speed?: number, reverse?: boolean } | null | undefined, sourceTicks: number): number
export function withSpeed<T extends { in?: number, out?: number, speed?: number }>(clip: T | null | undefined, speed: number): T & { speed: number, out: number }

// --- Effects registry + normalize (Roadmap C6) ---
// First wave: blur, sharpen, vignette, grain, chromakey, lut3d, stabilize,
// eq-grade. `renderReady` stays false until the export compiler maps the
// effect (R4) — consumers show a truthful "not exported yet" badge.
export type TmcutEffectParamKind = 'number' | 'color' | 'enum' | 'bool'

export interface TmcutEffectParam {
  name: string
  kind: TmcutEffectParamKind
  /** number params: inclusive range. */
  min?: number
  max?: number
  /** Applied by normalizeEffects for missing/invalid values. */
  default?: number | string | boolean
  /** enum params: allowed values. */
  options?: string[]
}

export interface TmcutEffectDescriptor {
  type: string
  /** English constant label; UIs translate by `type` instead. */
  label: string
  params: TmcutEffectParam[]
  /** False while the export compiler cannot map this effect yet (R4). */
  renderReady: boolean
}

export const EFFECT_REGISTRY: Record<string, TmcutEffectDescriptor>
export function validateEffect(effect: unknown): string[]
export function normalizeEffects(list: unknown): TmcutClipEffect[]
export function buildFfmpegEffectFilters(effects: unknown): string[]

export interface StabilizeOptions {
  level?: TmcutStabilizeLevel
  smoothing?: number
  shakiness?: number
  accuracy?: number
  stepsize?: number
  zoom?: number
  optalgo?: string
}
export const STABILIZE_PRESETS: Record<TmcutStabilizeLevel, Required<Omit<StabilizeOptions, 'level'>>>
export function escapeFilterPath(filePath: string): string
export function resolveStabilizeOptions(options?: TmcutStabilizeLevel | StabilizeOptions): Required<StabilizeOptions>
export function buildVidstabDetectArgs(input: string, trfPath: string, options?: TmcutStabilizeLevel | StabilizeOptions): string[]
export function buildVidstabTransformArgs(input: string, trfPath: string, output: string, options?: TmcutStabilizeLevel | StabilizeOptions): string[]

export interface TmcutMediaFolder {
  id: string
  name: string
  color?: string
  projectId?: string | null
  createdAt?: number | string
}

export interface TmcutFolderCounts {
  total: number
  unassigned: number
  [key: string]: number
}

export const FOLDER_TAG_COLORS: string[]
export function createFolder(folders: TmcutMediaFolder[], input?: Partial<TmcutMediaFolder>): TmcutMediaFolder
export function renameFolder(folders: TmcutMediaFolder[], folderId: string, newName: string): boolean
export function updateFolderColor(folders: TmcutMediaFolder[], folderId: string, color: string): boolean
export function removeFolder(folders: TmcutMediaFolder[], folderId: string): boolean
export function getFolder(folders: TmcutMediaFolder[], folderId: string): TmcutMediaFolder | null
export function setAssetFolder<T extends object>(asset: T, folderId: string | null, projectId?: string): boolean
export function getAssetFolder<T extends object>(asset: T, projectId?: string): string | null
export function filterAssetsByFolder<T extends object>(assets: T[], folderId?: string | null, projectId?: string): T[]
export function getFolderCounts<T extends object>(folders: TmcutMediaFolder[], assets: T[], projectId?: string): TmcutFolderCounts

export type TmcutTemplateCategory
  = | 'intro'
    | 'outro'
    | 'split-screen'
    | 'social'
    | 'promo'
    | 'minimal'
    | 'custom'

export interface TmcutTemplatePlaceholder {
  id: string
  type: 'video' | 'image' | 'audio' | 'text'
  label: string
  clipId: string
  trackId?: string
  defaultContent?: string
  required?: boolean
}

/**
 * Track shape stored inside a template payload. Templates round-trip
 * whatever timeline items the HOST app holds (v1 second-based clips in
 * tm-tools, v3 clips elsewhere) — the engine only touches id/type/items
 * structurally, so the clip shape stays intentionally loose here.
 * `validateTemplate` is the runtime gate, not the type system.
 */
export interface TmcutTemplateTrack {
  id?: string
  type: 'video' | 'text' | 'audio'
  name?: string
  items: unknown[]
}

export interface TmcutTemplate {
  id: string
  name: string
  description?: string
  category: TmcutTemplateCategory
  aspectRatio: '9:16' | '16:9' | '1:1'
  canvas: {
    width: number
    height: number
    fps: number
  }
  durationTicks: MediaTime
  tracks: TmcutTemplateTrack[]
  markers?: TmcutMarker[]
  placeholders: TmcutTemplatePlaceholder[]
  thumbnail?: string
  author?: string
  createdAt?: number
  isBuiltin?: boolean
}

export interface FilterTemplatesOptions {
  category?: string
  aspectRatio?: string
  search?: string
}

export interface InstantiateTemplateResult {
  canvas: { width: number, height: number, fps: number }
  timeline: {
    version: number
    tracks: TmcutTemplateTrack[]
    durationMs: number
    markers?: TmcutMarker[]
  }
  durationMs: number
}

/** Anything track-shaped `createTemplateFromTimeline` can snapshot. */
export type TmcutTemplateSourceTimeline = {
  tracks?: TmcutTemplateTrack[]
  markers?: TmcutMarker[]
}

export const BUILTIN_TEMPLATES: TmcutTemplate[]
export function getBuiltinTemplates(): TmcutTemplate[]
export function getTemplateById(templates: TmcutTemplate[] | null | undefined, id: string): TmcutTemplate | null
export function validateTemplate(template: unknown): { valid: boolean, errors: string[] }
export function filterTemplates(templates?: TmcutTemplate[] | null, options?: FilterTemplatesOptions): TmcutTemplate[]
export function createTemplateFromTimeline(timeline: TmcutTemplateSourceTimeline, meta?: Partial<TmcutTemplate>): TmcutTemplate
export function instantiateTemplate(template: TmcutTemplate, options?: { replacements?: Record<string, { src?: string, text?: string, name?: string }> }): InstantiateTemplateResult
export function replacePlaceholder(timeline: TmcutTimeline, clipId: string, replacement?: { src?: string, text?: string, name?: string, thumbPath?: string }): boolean
