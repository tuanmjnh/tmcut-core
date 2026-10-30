
import { getAssemblyReadyAssets } from './src/index.mjs'
const e = { id: 'm1', entryId: 'm1', title: 'M', category: 'music', assetKind: 'media', source: { type: 'local', url: '/mock/music.mp3' }, sourceUrl: '/mock/music.mp3', license: { commercialUse: true }, tags: [], sizeBytes: 100, generationMeta: { durationSec: 30 } }
const r = getAssemblyReadyAssets([e])
console.log('assets:', r.map(a => ({ ...a, source: a.source, sourceUrl: a.sourceUrl })))
