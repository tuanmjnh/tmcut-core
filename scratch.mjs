
import { getAssemblyReadyAssets } from './src/index.mjs'
const musicEntry = { id: 'm1', entryId: 'm1', title: 'M', category: 'music', assetKind: 'media', source: { type: 'local', url: '/mock/music.mp3' }, sourceUrl: '/mock/music.mp3', license: { commercialUse: true, attributionRequired: false, status: 'approved', reviewer: 't', reviewedAt: new Date().toISOString() }, tags: [], sizeBytes: 100, generationMeta: { durationSec: 30 } }
const out = getAssemblyReadyAssets([musicEntry])
console.log('result:', JSON.stringify(out))
