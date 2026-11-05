const fs = require('node:fs');
const crypto = require('node:crypto');

const SOURCES = {
  curated: 'https://raw.githubusercontent.com/pacocartones/free-llm-api-hub/main/data/providers.json',
  upstream: 'https://raw.githubusercontent.com/mnfst/awesome-free-llm-apis/main/data.json'
};

async function readJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'AGT-API-Finder-Pro-Sync/2.0' } });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}: ${url}`);
  return response.json();
}

function keyOf(name) {
  const key = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const aliases = {
    'googlegemini': 'google-gemini',
    'googlegeminiapiaistudio': 'google-gemini',
    'zaizhipuaiglm': 'zai',
    'zaizhipuai': 'zai',
    'mistrallaplateforme': 'mistral',
    'mistralai': 'mistral',
    'modelscopeapiinference': 'modelscope',
    'nvidianim': 'nvidia-nim',
    'cloudflareworkersai': 'cloudflare-workers-ai',
    'ovhcloudaiendpoints': 'ovhcloud-ai-endpoints'
  };
  return aliases[key] || key;
}

function fromCurated(p) {
  const modalities = Array.isArray(p.modalities) ? p.modalities : [];
  const verifiedAt = p.last_verified || 'not stated';
  const card = p.card_required === true ? 'Yes' : p.card_required === false ? 'No' : 'Not confirmed';
  const phone = p.phone_required === true ? 'Yes' : p.phone_required === false ? 'No' : 'Not confirmed';
  const policy = p.data_policy
    ? [p.data_policy.note, p.data_policy.retention && `Retention: ${p.data_policy.retention}`].filter(Boolean).join(' ')
    : (p.notes || 'Check current provider terms');
  const modelList = Array.isArray(p.models_free) ? p.models_free.filter(Boolean).slice(0, 30).join('; ') : '';
  const freeText = [p.free_tier, p.rate_limits && `Limits: ${p.rate_limits}`, p.notes].filter(Boolean).join(' ');
  const trModalities = { text: 'Metin', vision: 'Görsel anlama', image: 'Görsel üretimi', audio: 'Ses', embeddings: 'Vektör/embedding', rerank: 'Sıralama', ocr: 'OCR/belge okuma' };
  return {
    provider: p.name,
    category: p.category === 'trial' ? 'Trial Credits' : 'Free Provider',
    summary: freeText || 'Free or trial API access listed in the source dataset.',
    compatible: p.openai_compatible === true ? 'Yes' : p.openai_compatible === false ? 'No' : 'Varies',
    verification: `Official docs verified: ${verifiedAt}; card: ${card}; phone: ${phone}`,
    privacy: policy,
    bestFor: p.best_for || (modalities.length ? modalities.join(', ') : 'AI API access'),
    official: p.docs_url || '',
    docs: p.openai_base_url || p.docs_url || '',
    models: modelList || 'See provider documentation',
    whatItDoes: p.free_tier || 'Free or trial AI API access; check provider documentation.',
    useCases: modalities.join(', ') || 'AI API',
    whatItDoesTr: `Ücretsiz/deneme erişimi: ${p.free_tier || 'Ayrıntılar için resmî dokümantasyona bakın.'}`,
    useCasesTr: modalities.map(m => trModalities[m] || m).join(', ') || 'Yapay zekâ API'
  };
}

function fromUpstream(p) {
  const description = String(p.description || '').trim();
  const models = (p.models || []).map(m => m && m.name).filter(Boolean);
  const modality = [...new Set((p.models || []).map(m => m && m.modality).filter(Boolean))].join(', ');
  const category = /trial|credit|credits|signup.*credit/i.test(description) ? 'Trial Credits' : 'Free Provider';
  const compatible = /not.*openai|not.*compatible|ollama api/i.test(description) ? 'Varies' : 'Yes';
  const verification = /no credit card|required.*card|without.*card/i.test(description) ? 'No card stated' : 'Account/API key';
  const privacy = /train|training|data.*improv|prompt.*log|log.*prompt/i.test(description) ? description : 'Check current provider terms';
  const bestFor = modality ? `${modality} AI access` : 'AI API access';
  const whatItDoes = description.split('. ')[0] || `Access ${p.name || 'AI'} models through an API.`;
  const useCases = modality ? `AI applications, ${modality.toLowerCase()} workloads` : 'AI applications, prototyping, automation';
  return {
    provider: p.name, category, summary: description || 'Provider data available in the upstream directory.',
    compatible, verification, privacy, bestFor, official: p.url || '', docs: p.baseUrl || p.url || '',
    models: models.slice(0, 20).join('; ') || 'Various models',
    whatItDoes, useCases, whatItDoesTr: whatItDoes, useCasesTr: useCases
  };
}

async function main() {
  const [curated, upstream] = await Promise.all([readJson(SOURCES.curated), readJson(SOURCES.upstream)]);
  const records = new Map();
  for (const p of (curated.providers || [])) {
    if (p.verified !== true || !p.docs_url) continue;
    records.set(keyOf(p.name), fromCurated(p));
  }
  for (const p of (upstream.providers || [])) {
    if (!p || !p.name) continue;
    const key = keyOf(p.name);
    if (!records.has(key)) records.set(key, fromUpstream(p));
  }
  const providers = [...records.values()].sort((a, b) => a.provider.localeCompare(b.provider));
  if (providers.length < 26) throw new Error(`Safety check failed: only ${providers.length} providers; refusing to publish.`);

  const checkedAt = new Date().toISOString();
  const snapshotDate = checkedAt.slice(0, 10);
  const data = {
    product: 'AGT Studio — API Finder Pro',
    edition: 'Premium',
    snapshotDate,
    updatesIncluded: true,
    providerCount: providers.length,
    source: 'pacocartones/free-llm-api-hub + mnfst/awesome-free-llm-apis',
    sourceUrls: SOURCES,
    sourceDatasetVersion: curated.version || null,
    sourceDatasetGenerated: curated.generated || null,
    upstreamLastUpdated: upstream.lastUpdated || null,
    providers
  };
  const nextData = JSON.stringify(data, null, 2) + '\n';
  const dataHash = crypto.createHash('sha256').update(nextData).digest('hex').slice(0, 8);
  const dataVersion = `${snapshotDate.replaceAll('-', '.')}-${dataHash}`;

  fs.writeFileSync('data.json', nextData);
  fs.writeFileSync('update-manifest.json', JSON.stringify({
    appVersion: '1.0.0',
    dataVersion,
    updatedAt: checkedAt,
    dataUrl: 'https://raw.githubusercontent.com/zamansepeti43/api-finder-data/main/data.json',
    source: data.source,
    sourceUrls: SOURCES,
    changelog: `Synced verified free/trial AI API providers from two community datasets. Provider count: ${providers.length}. Curated dataset: ${curated.version || 'unknown'} (${curated.generated || 'unknown'}); secondary upstream: ${upstream.lastUpdated || 'unknown'}.`
  }, null, 2) + '\n');
  fs.writeFileSync('sync-status.json', JSON.stringify({
    checkedAt,
    status: 'updated',
    providerCount: providers.length,
    verifiedCuratedProviderCount: (curated.providers || []).filter(p => p.verified === true && p.docs_url).length,
    secondaryUpstreamProviderCount: (upstream.providers || []).length,
    curatedDatasetVersion: curated.version || null,
    curatedDatasetGenerated: curated.generated || null,
    upstreamLastUpdated: upstream.lastUpdated || null,
    dataVersion
  }, null, 2) + '\n');
  console.log(`Published ${providers.length} providers as ${dataVersion}`);
}

main().catch(error => { console.error(error); process.exit(1); });
