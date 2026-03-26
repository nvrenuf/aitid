// src/lib/sources.ts
// Data source adapters — each returns RawAdvisory[] for the classifier

import type { RawAdvisory } from './classifier.js';

const NVD_API    = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const GHSA_API   = 'https://api.github.com/graphql';
const CISA_API   = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const JFROG_FEED = 'https://research.jfrog.com/feed.json';
const ATLAS_URL  = 'https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/data/case-studies';

// ── helpers ──────────────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function slugId(source: string, id: string): string {
  return `${source}-${id}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      console.warn(`[sources] ${url} returned ${res.status}`);
      return null;
    }
    return await res.json() as T;
  } catch (err) {
    console.error(`[sources] fetch failed: ${url}`, err);
    return null;
  }
}

// ── AI keyword filter ─────────────────────────────────────────────────────
const AI_KEYWORDS = [
  'llm', 'large language model', 'gpt', 'openai', 'anthropic', 'claude',
  'copilot', 'gemini', 'huggingface', 'transformers', 'langchain', 'llamaindex',
  'ollama', 'mistral', 'llama', 'diffusion', 'stable diffusion', 'ai model',
  'machine learning', 'neural network', 'pytorch', 'tensorflow', 'safetensors',
  'pickle', 'model weight', 'fine-tun', 'embedding', 'vector database',
  'rag', 'retrieval augmented', 'mcp server', 'model context protocol',
  'ai agent', 'coding agent', 'skill.md', 'npm ai', 'python ai',
  'prompt injection', 'jailbreak', 'adversarial',
];

function isAIRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return AI_KEYWORDS.some(kw => lower.includes(kw));
}

// ── NVD (NIST) ────────────────────────────────────────────────────────────
interface NvdItem {
  cve: {
    id: string;
    published: string;
    lastModified: string;
    descriptions: { lang: string; value: string }[];
    metrics?: {
      cvssMetricV40?: { cvssData: { baseScore: number; vectorString: string } }[];
      cvssMetricV31?: { cvssData: { baseScore: number } }[];
    };
    references: { url: string; source: string }[];
  };
}

export async function fetchNVD(lookbackDays = 7): Promise<RawAdvisory[]> {
  const pubStartDate = `${daysAgo(lookbackDays)}T00:00:00.000`;
  const pubEndDate   = `${daysAgo(0)}T23:59:59.999`;
  const headers: Record<string, string> = {};
  if (process.env.NVD_API_KEY) headers['apiKey'] = process.env.NVD_API_KEY;

  const url = `${NVD_API}?pubStartDate=${pubStartDate}&pubEndDate=${pubEndDate}&resultsPerPage=200`;
  const data = await fetchJson<{ vulnerabilities: NvdItem[] }>(url, headers);
  if (!data?.vulnerabilities) return [];

  return data.vulnerabilities
    .filter(item => {
      const desc = item.cve.descriptions.find(d => d.lang === 'en')?.value ?? '';
      return isAIRelevant(desc);
    })
    .map(item => {
      const desc = item.cve.descriptions.find(d => d.lang === 'en')?.value ?? '';
      const cvss = item.cve.metrics?.cvssMetricV40?.[0]?.cvssData.baseScore
                ?? item.cve.metrics?.cvssMetricV31?.[0]?.cvssData.baseScore
                ?? 'unknown';
      const ref  = item.cve.references[0]?.url ?? '';
      return {
        id:          slugId('nvd', item.cve.id),
        source:      'NVD',
        sourceUrl:   `https://nvd.nist.gov/vuln/detail/${item.cve.id}`,
        publishedAt: item.cve.published,
        rawText:     `CVE: ${item.cve.id}\nCVSS: ${cvss}\nDescription: ${desc}\nReference: ${ref}`,
      };
    });
}

// ── GitHub Advisory Database ──────────────────────────────────────────────
const GHSA_QUERY = `
query($after: String) {
  securityAdvisories(first: 50, after: $after, orderBy: {field: PUBLISHED_AT, direction: DESC}) {
    nodes {
      ghsaId
      summary
      description
      severity
      publishedAt
      references { url }
      vulnerabilities(first: 5) {
        nodes {
          package { ecosystem name }
          vulnerableVersionRange
          firstPatchedVersion { identifier }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

export async function fetchGitHubAdvisories(lookbackDays = 7): Promise<RawAdvisory[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('[sources] No GITHUB_TOKEN — skipping GHSA (rate limited to 60 req/hr without token)');
    return [];
  }

  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const advisories: RawAdvisory[] = [];
  let after: string | null = null;

  for (let page = 0; page < 5; page++) {
    const body = JSON.stringify({ query: GHSA_QUERY, variables: { after } });
    const data = await fetchJson<any>(GHSA_API, {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    });
    // Note: POST for GraphQL
    try {
      const res = await fetch(GHSA_API, {
        method: 'POST',
        headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json() as any;
      const nodes = json?.data?.securityAdvisories?.nodes ?? [];

      for (const node of nodes) {
        if (node.publishedAt < cutoff) break;
        if (!isAIRelevant(`${node.summary} ${node.description}`)) continue;

        const pkgs = node.vulnerabilities.nodes
          .map((v: any) => `${v.package.ecosystem}/${v.package.name}`)
          .join(', ');

        advisories.push({
          id:          slugId('ghsa', node.ghsaId),
          source:      'GitHub Advisory Database',
          sourceUrl:   node.references[0]?.url ?? `https://github.com/advisories/${node.ghsaId}`,
          publishedAt: node.publishedAt,
          rawText:     `GHSA: ${node.ghsaId}\nSeverity: ${node.severity}\nPackages: ${pkgs}\nSummary: ${node.summary}\nDescription: ${node.description}`,
        });
      }

      const pageInfo = json?.data?.securityAdvisories?.pageInfo;
      if (!pageInfo?.hasNextPage) break;
      after = pageInfo.endCursor;
    } catch (err) {
      console.error('[sources] GHSA fetch failed', err);
      break;
    }
  }

  return advisories;
}

// ── CISA KEV ──────────────────────────────────────────────────────────────
interface CisaKev {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  notes: string;
}

export async function fetchCISAKEV(lookbackDays = 14): Promise<RawAdvisory[]> {
  const cutoff = daysAgo(lookbackDays);
  const data = await fetchJson<{ vulnerabilities: CisaKev[] }>(CISA_API);
  if (!data?.vulnerabilities) return [];

  return data.vulnerabilities
    .filter(v => v.dateAdded >= cutoff && isAIRelevant(`${v.vendorProject} ${v.product} ${v.vulnerabilityName} ${v.shortDescription}`))
    .map(v => ({
      id:          slugId('cisa-kev', v.cveID),
      source:      'CISA KEV',
      sourceUrl:   `https://www.cisa.gov/known-exploited-vulnerabilities-catalog`,
      publishedAt: new Date(v.dateAdded).toISOString(),
      rawText:     `CVE: ${v.cveID}\nVendor: ${v.vendorProject}\nProduct: ${v.product}\nName: ${v.vulnerabilityName}\nDescription: ${v.shortDescription}\nRequired Action: ${v.requiredAction}\nKnown Ransomware: ${v.knownRansomwareCampaignUse}`,
    }));
}

// ── JFrog Security Research ───────────────────────────────────────────────
// JFrog publishes a public research feed; filter for AI/ML package threats
export async function fetchJFrog(lookbackDays = 14): Promise<RawAdvisory[]> {
  // JFrog research blog RSS → parse titles/summaries for AI relevance
  const url = 'https://jfrog.com/blog/category/security/feed/';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const advisories: RawAdvisory[] = [];

    for (const [, itemXml] of items) {
      const title   = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1]   ?? itemXml.match(/<title>(.*?)<\/title>/)?.[1]   ?? '';
      const desc    = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]>/s)?.[1] ?? itemXml.match(/<description>(.*?)<\/description>/s)?.[1] ?? '';
      const link    = itemXml.match(/<link>(.*?)<\/link>/)?.[1]   ?? '';
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '';
      const date    = pubDate ? new Date(pubDate) : new Date();

      if (date < cutoff) continue;
      if (!isAIRelevant(`${title} ${desc}`)) continue;

      advisories.push({
        id:          slugId('jfrog', title.slice(0, 40)),
        source:      'JFrog Security Research',
        sourceUrl:   link,
        publishedAt: date.toISOString(),
        rawText:     `Title: ${title}\nLink: ${link}\nSummary: ${desc.replace(/<[^>]+>/g, '').slice(0, 500)}`,
      });
    }

    return advisories;
  } catch (err) {
    console.error('[sources] JFrog fetch failed', err);
    return [];
  }
}

// ── npm security advisories ───────────────────────────────────────────────
// Search for recently flagged AI/ML packages via npm audit API
const AI_NPM_PACKAGES = [
  '@anthropic-ai/sdk', 'openai', '@langchain/core', 'langchain',
  'llamaindex', 'ollama', 'transformers', 'huggingface',
  '@huggingface/inference', 'claude-code', 'copilot',
];

export async function fetchNpmAdvisories(): Promise<RawAdvisory[]> {
  try {
    const res = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/search?perPage=50&order=desc', {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { objects: { advisory: { id: number; title: string; overview: string; recommendation: string; severity: string; created: string; url: string; module_name: string } }[] };

    return data.objects
      .filter(({ advisory: a }) => isAIRelevant(`${a.module_name} ${a.title} ${a.overview}`))
      .map(({ advisory: a }) => ({
        id:          slugId('npm', String(a.id)),
        source:      'npm Security Advisory',
        sourceUrl:   a.url,
        publishedAt: a.created,
        rawText:     `Package: ${a.module_name}\nSeverity: ${a.severity}\nTitle: ${a.title}\nOverview: ${a.overview}\nRecommendation: ${a.recommendation}`,
      }));
  } catch (err) {
    console.error('[sources] npm advisory fetch failed', err);
    return [];
  }
}

// ── Aggregate all sources ─────────────────────────────────────────────────
export async function fetchAllSources(lookbackDays = 7): Promise<{
  advisories: RawAdvisory[];
  sourcesCounted: Record<string, number>;
}> {
  console.log('[sources] Polling all data sources...');

  const [nvd, ghsa, cisa, jfrog, npm] = await Promise.allSettled([
    fetchNVD(lookbackDays),
    fetchGitHubAdvisories(lookbackDays),
    fetchCISAKEV(lookbackDays * 2),
    fetchJFrog(lookbackDays * 2),
    fetchNpmAdvisories(),
  ]);

  const extract = (r: PromiseSettledResult<RawAdvisory[]>) =>
    r.status === 'fulfilled' ? r.value : [];

  const allAdvisories = [
    ...extract(nvd),
    ...extract(ghsa),
    ...extract(cisa),
    ...extract(jfrog),
    ...extract(npm),
  ];

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = allAdvisories.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  const sourcesCounted = {
    NVD:    extract(nvd).length,
    GHSA:   extract(ghsa).length,
    CISA:   extract(cisa).length,
    JFrog:  extract(jfrog).length,
    npm:    extract(npm).length,
  };

  console.log(`[sources] Found ${unique.length} unique AI-relevant advisories`, sourcesCounted);
  return { advisories: unique, sourcesCounted };
}
