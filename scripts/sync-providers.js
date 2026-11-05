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

const MODALITY_EN = { text: 'Text AI', vision: 'Image understanding', image: 'Image generation', audio: 'Audio', embeddings: 'Embeddings', rerank: 'Reranking', ocr: 'Document OCR', video: 'Video analysis', translation: 'Translation' };

const MODALITY_TR = {
  text: 'Metin yapay zekâsı',
  vision: 'Görsel anlama',
  image: 'Görsel üretimi',
  audio: 'Ses işlemleri',
  embeddings: 'Metin vektörleme',
  rerank: 'Sonuç sıralama',
  ocr: 'Belge ve yazı okuma',
  video: 'Video analizi',
  translation: 'Çeviri'
};

const PURPOSE_TR = {
  'AI Horde': 'Topluluk destekli metin ve görsel üretimi',
  'AI21 Labs': 'Jamba dil modelleriyle metin üretimi',
  'Aion Labs': 'Metin üretimi ve rol yapma modelleri',
  'Alibaba Cloud (Model Studio)': 'Qwen modelleriyle metin ve görsel anlama',
  'Arli AI': 'Metin üretimi ve test amaçlı dil modelleri',
  'AssemblyAI': 'Konuşmayı yazıya çevirme ve dil modeli erişimi',
  'Baseten': 'Yapay zekâ modellerini API üzerinden çalıştırma',
  'Camb.ai': 'Seslendirme, dublaj ve konuşma çevirisi',
  'Cartesia': 'Gerçek zamanlı metin-ses dönüştürme',
  'Cerebras': 'Hızlı dil modeli çıkarımı',
  'Cloudflare Workers AI': 'Metin, görsel ve ses yapay zekâ modelleri',
  'Cohere': 'Metin üretimi, vektörleme ve arama sıralama',
  'Contextual AI': 'Belge tabanlı yanıt ve arama sıralama',
  'Datalab (Marker / Surya)': 'PDF ve belgelerden metin çıkarma',
  'Deepgram': 'Konuşmayı yazıya ve metni sese dönüştürme',
  'ElevenLabs': 'Yapay zekâ seslendirme ve konuşma tanıma',
  'Fireworks AI': 'Açık kaynak dil modelleriyle metin üretimi',
  'Fish Audio': 'Yapay zekâ seslendirme',
  'Gladia': 'Ses ve konuşma tanıma',
  'Gonka Broker': 'Dağıtık altyapıda dil modeli API erişimi',
  'Google Gemini API (AI Studio)': 'Gemini ile metin, görsel ve çoklu ortam işlemleri',
  'Groq': 'Hızlı dil modeli ve ses API erişimi',
  'Hume AI (Octave TTS)': 'Duygulu yapay zekâ seslendirme',
  'IBM watsonx.ai (Lite plan)': 'Dil modeli ve belge işleme',
  'Jina AI': 'Metin vektörleme ve arama sıralama',
  'Kilo Code': 'Kod ve metin üretimi için model yönlendirme',
  'LlamaParse (LlamaCloud)': 'PDF ve belgeleri yapay zekâya uygun metne çevirme',
  'LLM7.io': 'Tek API üzerinden dil modeli erişimi',
  'Mistral (La Plateforme)': 'Mistral dil modelleriyle metin üretimi',
  'Mixedbread': 'Metin vektörleme ve akıllı arama',
  'Modal': 'Yapay zekâ modellerini bulutta çalıştırma',
  'ModelScope (API-Inference)': 'Açık kaynak yapay zekâ modellerine API erişimi',
  'Moondream Cloud': 'Görselleri anlama ve analiz etme',
  'Nanonets': 'Belge okuma ve veri çıkarma',
  'Nebius AI Studio': 'Bulut üzerinden dil modeli çalıştırma',
  'NLP Cloud': 'Metin işleme ve dil modeli API erişimi',
  'Novita AI': 'Dil ve görsel yapay zekâ modelleri',
  'Nutrient (Data Extraction API)': 'Belgelerden metin ve veri çıkarma',
  'NVIDIA NIM': 'NVIDIA yapay zekâ modellerine API erişimi',
  'OCR.space': 'Görsel ve PDF dosyalarından yazı okuma',
  'Ollama Cloud': 'Bulutta açık kaynak dil modelleri çalıştırma',
  'OpenRouter': 'Tek API ile birçok yapay zekâ modeline erişim',
  'OVHcloud AI Endpoints': 'Metin, görsel ve ses modelleri',
  'Photoroom': 'Görsel düzenleme ve arka plan silme',
  'Pinecone Inference': 'Metin vektörleme ve anlamsal arama',
  'Pollinations.ai': 'Metin, görsel, ses ve video üretimi',
  'Poolside': 'Kod üretimi için dil modelleri',
  'Retell AI': 'Yapay zekâ telefon ve sesli asistanları',
  'Rev AI': 'Ses kayıtlarını yazıya çevirme',
  'Rime': 'Yapay zekâ metin seslendirme',
  'Runware': 'Görsel, video ve ses üretimi',
  'SambaNova Cloud': 'Hızlı dil modeli API erişimi',
  'Sarvam AI': 'Metin, konuşma ve çeviri işlemleri',
  'Scaleway Generative APIs': 'Metin ve ses yapay zekâ API erişimi',
  'SiliconFlow': 'Açık kaynak dil ve görsel modelleri',
  'Smallest.ai (Waves)': 'Seslendirme, konuşma tanıma ve sesli asistan',
  'Speechify API': 'Metni doğal sese dönüştürme',
  'Speechmatics': 'Konuşmayı yazıya ve metni sese dönüştürme',
  'Tencent Hunyuan': 'Metin ve görsel anlayan dil modelleri',
  'Twelve Labs (Marengo Embed)': 'Video ve ses içeriğini analiz etme',
  'Typhoon (SCB 10X)': 'Tayca ve çok dilli dil modelleri',
  'Unreal Speech': 'Metni sese dönüştürme',
  'Unstructured': 'PDF ve belgeleri ayrıştırma',
  'Upstage': 'Dil modeli, OCR ve belge analizi',
  'Vercel AI Gateway': 'Tek noktadan farklı dil modellerine erişim',
  'Veryfi': 'Fatura ve fişlerden veri çıkarma',
  'Voicegain': 'Konuşmayı yazıya dönüştürme',
  'Voyage AI': 'Metin vektörleme ve anlamsal arama',
  'W&B Inference': 'Dil modellerini API üzerinden çalıştırma',
  'Z.ai (Zhipu AI / GLM)': 'GLM dil ve görsel modelleri'
};

function shortTurkish(p, modalities, category) {
  const normalizedModalities = modalities.map(m => {
    const value = String(m || '').toLowerCase();
    if (value.includes('text')) return 'text';
    if (value.includes('vision')) return 'vision';
    if (value.includes('image')) return 'image';
    if (value.includes('audio') || value.includes('speech') || value.includes('tts') || value.includes('stt')) return 'audio';
    if (value.includes('embed')) return 'embeddings';
    if (value.includes('rerank')) return 'rerank';
    if (value.includes('ocr') || value.includes('document')) return 'ocr';
    if (value.includes('video')) return 'video';
    if (value.includes('translat')) return 'translation';
    return null;
  }).filter(Boolean);
  const purpose = PURPOSE_TR[p.name] || 'Yapay zekâ API hizmeti';
  const freeNote = category === 'Trial Credits'
    ? 'Yeni hesaplara deneme erişimi veya başlangıç kredisi sunulur.'
    : 'Ücretsiz kullanım kotası sunulur.';
  const modalityText = [...new Set(normalizedModalities)].map(m => MODALITY_TR[m]).filter(Boolean).slice(0, 3).join(', ');
  return {
    purpose,
    summaryTr: `${purpose}. ${freeNote} Kota ve koşullar sağlayıcıya göre değişir.`,
    whatItDoesTr: `${purpose}. ${freeNote}`,
    useCasesTr: modalityText || purpose
  };
}

function fromCurated(p) {
  const modalities = Array.isArray(p.modalities) ? p.modalities : [];
  const freeText = String(p.free_tier || '').toLowerCase();
  const isOngoingFree = /permanent free|free plan \(\$0\)|permanently free|free forever|free tier.*permanent/.test(freeText);
  const category = p.category === 'trial' && !isOngoingFree ? 'Deneme Kredisi' : 'Ücretsiz';
  const tr = shortTurkish(p, modalities, category === 'Deneme Kredisi' ? 'Trial Credits' : 'Free Provider');
  const modelList = Array.isArray(p.models_free) ? p.models_free.filter(Boolean).slice(0, 12).join('; ') : '';
  return {
    provider: p.name,
    category: category === 'Deneme Kredisi' ? 'Trial Credits' : 'Free Provider',
    categoryTr: category,
    summary: String(p.free_tier || p.best_for || tr.purpose).slice(0, 220),
    summaryTr: tr.summaryTr,
    compatible: p.openai_compatible === true ? 'Yes' : p.openai_compatible === false ? 'No' : 'Varies',
    compatibleTr: p.openai_compatible === true ? 'Evet' : p.openai_compatible === false ? 'Hayır' : 'Değişken',
    verification: p.verified === true ? 'Verified in source' : 'Verification pending',
    verificationTr: p.verified === true ? 'Kaynakta doğrulanmış' : 'Doğrulama bekliyor',
    privacy: 'Check the provider privacy policy for data retention and model-training terms.',
    privacyTr: 'Veri saklama ve model eğitimi koşullarını sağlayıcının gizlilik politikasından kontrol edin.',
    bestFor: p.best_for || tr.purpose,
    bestForTr: tr.purpose,
    official: p.docs_url || '',
    docs: p.openai_base_url || p.docs_url || '',
    models: modelList || 'Modeller için resmî siteye bakın',
    whatItDoes: String(p.free_tier || p.best_for || p.name).slice(0, 220),
    useCases: modalities.map(m => MODALITY_EN[m] || m).slice(0, 3).join(', ') || 'AI applications',
    whatItDoesTr: tr.whatItDoesTr,
    useCasesTr: tr.useCasesTr
  };
}

function fromUpstream(p) {
  const models = (p.models || []).map(m => m && m.name).filter(Boolean);
  const modalityRaw = [...new Set((p.models || []).map(m => m && m.modality).filter(Boolean))];
  const isTrial = /trial|credit|credits|signup.*credit/i.test(String(p.description || ''));
  const category = isTrial ? 'Trial Credits' : 'Free Provider';
  const tr = shortTurkish({ name: p.name }, modalityRaw, category);
  return {
    provider: p.name,
    category,
    categoryTr: isTrial ? 'Deneme Kredisi' : 'Ücretsiz',
    summary: String(p.description || p.name).split('. ')[0].slice(0, 220),
    summaryTr: tr.summaryTr,
    compatible: 'Varies',
    compatibleTr: 'Değişken',
    verification: 'Listed in secondary community dataset; verify current terms on the official site',
    verificationTr: 'İkinci topluluk kaynağında listeleniyor; güncel koşulları resmî siteden kontrol edin',
    privacy: 'Check the provider privacy policy for data retention and model-training terms.',
    privacyTr: 'Veri saklama ve model eğitimi koşullarını sağlayıcının gizlilik politikasından kontrol edin.',
    bestFor: tr.purpose,
    bestForTr: tr.purpose,
    official: p.url || '',
    docs: p.baseUrl || p.url || '',
    models: models.slice(0, 12).join('; ') || 'Modeller için resmî siteye bakın',
    whatItDoes: String(p.description || p.name).split('. ')[0].slice(0, 220),
    useCases: modalityRaw.map(m => MODALITY_EN[String(m).toLowerCase()] || m).slice(0, 3).join(', ') || 'AI applications',
    whatItDoesTr: tr.whatItDoesTr,
    useCasesTr: tr.useCasesTr
  };
}

async function main() {
  const [curated, upstream] = await Promise.all([readJson(SOURCES.curated), readJson(SOURCES.upstream)]);
  const records = new Map();
  for (const p of (curated.providers || [])) {
    if (p.verified !== true || !p.docs_url || p.slug === 'huggingface') continue;
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
