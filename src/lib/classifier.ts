// src/lib/classifier.ts
// Claude-powered enrichment: takes raw advisory text and returns a structured Threat

import Anthropic from '@anthropic-ai/sdk';
import type { Threat, Severity, ThreatType, ModelTag, VectorTag, AtlasTTP, BlendedScore, IOC, ThreatStatus } from './types.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

const CLASSIFIER_SYSTEM = `You are a senior threat intelligence analyst specializing in AI/ML security.
Your job is to analyze security advisories and classify them into structured threat records for an AI Threat Intelligence Dashboard.

You must respond ONLY with a valid JSON object. No preamble, no markdown fences, no explanation.

SEVERITY RULES (blended CVSS 4.0 + MITRE ATLAS):
- critical: CVSS >= 9.0 OR (CVSS >= 7.0 AND actively exploited in the wild AND maps to 2+ ATLAS TTPs)
- high: CVSS 7.0-8.9 OR (CVSS 5.0-6.9 AND actively exploited)
- medium: CVSS 4.0-6.9, limited exploitation evidence
- low: CVSS < 4.0, theoretical or requires significant prerequisites
- info: No CVSS applicable, informational/policy change

BLENDED SCORE:
- Start with CVSS base (estimate if not provided, explain in rationale)
- Add up to 0.5 for each additional ATLAS TTP beyond the first (max +1.5)
- Add 0.3 if actively exploited in the wild
- Add 0.2 if affects AI developer tooling (supply chain multiplier)
- Cap at 10.0

ATLAS TTPs to consider:
AML.T0011 - User Execution: Malicious Package
AML.T0020 - Poison Training Data
AML.T0043 - Craft Adversarial Data
AML.T0044 - Full ML Model Access
AML.T0048 - Exfiltrate Via ML Inference API
AML.T0051 - LLM Prompt Injection
AML.T0053 - Supply Chain Compromise
AML.T0054 - LLM Jailbreak

MODEL TAGS (use all that apply):
openai-gpt4o, openai-o3, openai-o4, openai-gpt41,
anthropic-claude, microsoft-copilot-github, microsoft-copilot-m365,
huggingface-oss, meta-llama, mistral, multi-model, other

VECTOR TAGS (use all that apply):
npm, pypi, github-repo, github-advisory, vs-code-ext, mcp-server,
huggingface, skill-md, plugin-store, api, ide, browser-ext, other

THREAT TYPES (pick the best single primary type):
jailbreak, prompt-injection, data-exfil, supply-chain, model-poisoning,
plugin-abuse, mcp-abuse, skill-file-abuse, credential-theft, api-abuse, other

RESPONSE SCHEMA:
{
  "title": "concise threat title (max 80 chars)",
  "description": "2-3 sentence technical description of the threat, mechanism, and impact",
  "severity": "critical|high|medium|low|info",
  "score": {
    "cvss": 0.0,
    "atlasBonus": 0.0,
    "blended": 0.0,
    "rationale": "one sentence explaining the blended score"
  },
  "status": "active|investigating|mitigated|patched|disputed",
  "type": "primary threat type",
  "models": ["array of model tags"],
  "vectors": ["array of vector tags"],
  "ttps": [
    { "id": "AML.T0051", "name": "LLM Prompt Injection", "tactic": "Initial Access", "url": "https://atlas.mitre.org/techniques/AML.T0051" }
  ],
  "iocs": [
    { "type": "domain|ip|hash|package|repo|file-path|registry", "value": "...", "context": "..." }
  ],
  "cve": "CVE-XXXX-XXXXX or null",
  "mitigations": ["array of 2-4 actionable mitigation steps"],
  "affectedVersions": "string or null",
  "patchVersion": "string or null"
}`;

export interface RawAdvisory {
  id: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
  rawText: string;
}

export async function classifyAdvisory(advisory: RawAdvisory): Promise<Threat | null> {
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: CLASSIFIER_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Classify this security advisory into a structured threat record:\n\nSOURCE: ${advisory.source}\nURL: ${advisory.sourceUrl ?? 'N/A'}\nDATE: ${advisory.publishedAt}\n\nADVISORY TEXT:\n${advisory.rawText}`,
        },
      ],
    });

    const text = message.content.find(b => b.type === 'text')?.text ?? '';
    const cleaned = text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<Threat>;

    const threat: Threat = {
      id:          advisory.id,
      title:       parsed.title        ?? 'Untitled threat',
      description: parsed.description  ?? '',
      severity:    (parsed.severity    as Severity)     ?? 'medium',
      score:       parsed.score        ?? { cvss:0, atlasBonus:0, blended:0, rationale:'' },
      status:      (parsed.status      as ThreatStatus) ?? 'active',
      type:        (parsed.type        as ThreatType)   ?? 'other',
      models:      (parsed.models      as ModelTag[])   ?? ['other'],
      vectors:     (parsed.vectors     as VectorTag[])  ?? ['other'],
      ttps:        (parsed.ttps        as AtlasTTP[])   ?? [],
      iocs:        (parsed.iocs        as IOC[])        ?? [],
      cve:         parsed.cve          ?? undefined,
      source:      advisory.source,
      sourceUrl:   advisory.sourceUrl,
      publishedAt: advisory.publishedAt,
      updatedAt:   new Date().toISOString(),
      mitigations: parsed.mitigations  ?? [],
      affectedVersions: parsed.affectedVersions ?? undefined,
      patchVersion:     parsed.patchVersion     ?? undefined,
      raw:         advisory.rawText,
    };

    return threat;
  } catch (err) {
    console.error(`[classifier] Failed to classify advisory ${advisory.id}:`, err);
    return null;
  }
}

// Batch classify with rate limiting
export async function classifyBatch(
  advisories: RawAdvisory[],
  onProgress?: (done: number, total: number) => void
): Promise<Threat[]> {
  const results: Threat[] = [];
  const DELAY_MS = 800; // stay well within rate limits

  for (let i = 0; i < advisories.length; i++) {
    const threat = await classifyAdvisory(advisories[i]);
    if (threat) results.push(threat);
    onProgress?.(i + 1, advisories.length);
    if (i < advisories.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  return results;
}
