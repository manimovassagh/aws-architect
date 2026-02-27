import type { CloudResource, AiChatMessage, AiChatResponse, AiStatusResponse, AiModelsResponse } from '@infragraph/shared';

/** Ollama API base URL — defaults to localhost for local dev, Docker overrides via env. */
export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
}

export function getDefaultModel(): string {
  return process.env.OLLAMA_DEFAULT_MODEL ?? 'tinyllama';
}

/** Check if Ollama is reachable and whether the target model is loaded. */
export async function checkOllamaStatus(model?: string): Promise<AiStatusResponse> {
  const targetModel = model ?? getDefaultModel();
  try {
    const res = await fetch(`${getOllamaBaseUrl()}/api/tags`);
    if (!res.ok) {
      return { available: false, model: targetModel, modelLoaded: false, error: `Ollama returned ${res.status}` };
    }
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models = data.models ?? [];
    const loaded = models.some((m) => m.name === targetModel || m.name.startsWith(`${targetModel}:`));
    return { available: true, model: targetModel, modelLoaded: loaded };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { available: false, model: targetModel, modelLoaded: false, error: message };
  }
}

/** List all models available in Ollama. */
export async function listModels(): Promise<AiModelsResponse> {
  const res = await fetch(`${getOllamaBaseUrl()}/api/tags`);
  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}`);
  }
  const data = (await res.json()) as { models?: Array<{ name: string; size: number; modified_at: string }> };
  return {
    models: (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size,
      modifiedAt: m.modified_at,
    })),
  };
}

/** Send a chat completion request to Ollama (non-streaming). */
export async function chat(messages: AiChatMessage[], model?: string): Promise<AiChatResponse> {
  const targetModel = model ?? getDefaultModel();
  const start = Date.now();

  const res = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: targetModel, messages, stream: false }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama chat failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { message?: { role: string; content: string } };
  const durationMs = Date.now() - start;

  return {
    message: {
      role: 'assistant',
      content: data.message?.content ?? '',
    },
    model: targetModel,
    durationMs,
  };
}

// Keys that should never be sent to the LLM
const SENSITIVE_DENY_LIST = new Set([
  'password', 'secret', 'access_key', 'secret_key', 'private_key',
  'token', 'api_key', 'connection_string', 'master_password',
]);

/** Build a compact system prompt with infrastructure context for the LLM. */
export function buildSystemPrompt(resources: CloudResource[]): string {
  const MAX_RESOURCES = 20;
  const MAX_ATTRS = 3;

  const truncated = resources.slice(0, MAX_RESOURCES);

  const summary = truncated.map((r) => {
    const sensitiveKeys = new Set([
      ...(r.sensitiveKeys ?? []),
      ...Object.keys(r.attributes).filter((k) => SENSITIVE_DENY_LIST.has(k.toLowerCase())),
    ]);

    // Pick the first N non-sensitive attributes
    const safeAttrs: Record<string, unknown> = {};
    let count = 0;
    for (const [key, value] of Object.entries(r.attributes)) {
      if (count >= MAX_ATTRS) break;
      if (sensitiveKeys.has(key)) continue;
      safeAttrs[key] = value;
      count++;
    }

    return {
      id: r.id,
      type: r.type,
      name: r.name,
      region: r.region,
      tags: Object.keys(r.tags).length > 0 ? r.tags : undefined,
      attrs: count > 0 ? safeAttrs : undefined,
    };
  });

  const resourceJson = JSON.stringify(summary);
  const note = resources.length > MAX_RESOURCES
    ? ` (showing ${MAX_RESOURCES} of ${resources.length} total)`
    : '';

  return [
    'You are an infrastructure advisor for InfraGraph. Analyze the cloud resources below and answer questions about architecture, security, cost, and best practices.',
    `Infrastructure${note}:`,
    resourceJson,
  ].join('\n');
}
