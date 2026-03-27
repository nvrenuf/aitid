export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export const MODEL_FILTERS = {
  openai: (threat) =>
    threat.models.some((model) => ['openai-gpt4o', 'openai-o3', 'openai-o4', 'openai-gpt41'].includes(model)),
  claude: (threat) => threat.models.some((model) => model === 'anthropic-claude'),
  copilot: (threat) =>
    threat.models.some((model) => ['microsoft-copilot-github', 'microsoft-copilot-m365'].includes(model)),
  oss: (threat) =>
    threat.models.some((model) => ['huggingface-oss', 'meta-llama', 'mistral'].includes(model)) ||
    threat.vectors.includes('huggingface'),
};

export function shortModel(model) {
  return model
    .replace('openai-', '')
    .replace('anthropic-', '')
    .replace('microsoft-', '')
    .replace('huggingface-', '')
    .replace('meta-', '');
}

export function sortThreats(threats) {
  return [...threats].sort((left, right) => {
    const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    return severityDelta !== 0 ? severityDelta : right.score.blended - left.score.blended;
  });
}

export function filterThreats(threats, filter) {
  if (!filter || filter === 'all') return threats;
  return threats.filter((threat) => threat.severity === filter || threat.type === filter || threat.vectors.includes(filter));
}

export function buildDrawerSubtitle(threat) {
  return `${threat.type} | ${threat.severity.toUpperCase()} | score ${threat.score.blended.toFixed(1)}`;
}
