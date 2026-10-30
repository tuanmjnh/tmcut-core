
import { getAssemblyReadyAssets } from './src/index.mjs'
const e = { id: 'm1', entryId: 'm1', title: 'M', category: 'music', assetKind: 'media', source: { type: 'remote', url: 'https://test.com/m.mp3' }, sourceUrl: 'https://test.com/m.mp3', license: { commercialUse: true }, tags: [], sizeBytes: 100, generationMeta: { durationSec: 30 } }
const r = getAssemblyReadyAssets([e])
console.log('assets:', r.map(a => ({ id: a.entryId, src: a.source?.type === 'remote' ? a.source.url : a.sourceUrl })))
