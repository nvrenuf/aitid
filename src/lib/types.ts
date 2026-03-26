// src/lib/types.ts
// Central type definitions for the AITID platform

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ThreatStatus = 'active' | 'investigating' | 'mitigated' | 'patched' | 'disputed';
export type ThreatType =
  | 'jailbreak'
  | 'prompt-injection'
  | 'data-exfil'
  | 'supply-chain'
  | 'model-poisoning'
  | 'plugin-abuse'
  | 'mcp-abuse'
  | 'skill-file-abuse'
  | 'credential-theft'
  | 'api-abuse'
  | 'other';

export type VectorTag =
  | 'npm'
  | 'pypi'
  | 'github-repo'
  | 'github-advisory'
  | 'vs-code-ext'
  | 'mcp-server'
  | 'huggingface'
  | 'skill-md'
  | 'plugin-store'
  | 'api'
  | 'ide'
  | 'browser-ext'
  | 'other';

export type ModelTag =
  | 'openai-gpt4o'
  | 'openai-o3'
  | 'openai-o4'
  | 'openai-gpt41'
  | 'anthropic-claude'
  | 'microsoft-copilot-github'
  | 'microsoft-copilot-m365'
  | 'huggingface-oss'
  | 'meta-llama'
  | 'mistral'
  | 'multi-model'
  | 'other';

export interface AtlasTTP {
  id: string;        // e.g. "AML.T0051"
  name: string;      // e.g. "LLM Prompt Injection"
  tactic: string;    // e.g. "Initial Access"
  url: string;
}

export interface BlendedScore {
  cvss: number;           // 0-10 base CVSS 4.0
  atlasBonus: number;     // additive bonus for multi-TTP / active exploitation
  blended: number;        // final score (capped at 10)
  rationale: string;      // human-readable explanation from classifier
}

export interface IOC {
  type: 'domain' | 'ip' | 'hash' | 'package' | 'repo' | 'file-path' | 'registry';
  value: string;
  context?: string;
}

export interface Threat {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  score: BlendedScore;
  status: ThreatStatus;
  type: ThreatType;
  models: ModelTag[];
  vectors: VectorTag[];
  ttps: AtlasTTP[];
  iocs: IOC[];
  cve?: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;      // ISO date string
  updatedAt: string;
  raw?: string;             // original advisory text
  mitigations: string[];
  affectedVersions?: string;
  patchVersion?: string;
}

export interface PipelineRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  sourcesPolled: string[];
  newThreats: number;
  updatedThreats: number;
  errors: string[];
}

export interface DashboardStats {
  totalThreats: number;
  activeCritical: number;
  activeHigh: number;
  newThisWeek: number;
  modelsAffected: number;
  lastUpdated: string;
  pipelineStatus: 'healthy' | 'stale' | 'degraded' | 'failed' | 'error';
}
