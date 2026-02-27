import type { CloudProvider, ParseResponse, ApiError, SessionSummary, Session, CreateSessionRequest, GitHubScanResponse, GitHubRepo, GitHubTokenResponse, AiStatusResponse, AiModelsResponse, AiChatRequest, AiChatResponse } from '@infragraph/shared';
import { supabase } from './supabase';
import { getGitHubToken } from './github';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/** Returns auth headers if logged in, empty object otherwise. */
async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function parseFile(file: File, provider?: CloudProvider): Promise<ParseResponse> {
  const form = new FormData();
  form.append('tfstate', file);

  const params = provider ? `?provider=${provider}` : '';
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/parse${params}`, { method: 'POST', body: form, headers });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }

  return res.json();
}

export async function parseHcl(files: File[], provider?: CloudProvider): Promise<ParseResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }

  const params = provider ? `?provider=${provider}` : '';
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/parse/hcl${params}`, { method: 'POST', body: form, headers });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }

  return res.json();
}

export async function parseCfn(file: File, source?: 'cloudformation' | 'cdk'): Promise<ParseResponse> {
  const form = new FormData();
  form.append('template', file);

  const params = source === 'cdk' ? '?source=cdk' : '';
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/parse/cfn${params}`, { method: 'POST', body: form, headers });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }

  return res.json();
}

export async function parsePlan(file: File): Promise<ParseResponse> {
  const form = new FormData();
  form.append('plan', file);

  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/parse/plan`, { method: 'POST', body: form, headers });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }

  return res.json();
}

// ─── Session API ─────────────────────────────────────────────────────────────

export async function listSessions(): Promise<SessionSummary[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/sessions`, { headers });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

export async function getSession(id: string): Promise<Session> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/sessions/${id}`, { headers });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

export async function saveSession(payload: CreateSessionRequest): Promise<SessionSummary> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/sessions/${id}`, { method: 'DELETE', headers });
  if (!res.ok && res.status !== 204) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
}

// ─── GitHub Connect API ─────────────────────────────────────────────────────

/** Returns X-GitHub-Token header if a GitHub token is stored. */
function githubTokenHeader(): Record<string, string> {
  const token = getGitHubToken();
  return token ? { 'X-GitHub-Token': token } : {};
}

export async function exchangeGitHubCode(code: string): Promise<GitHubTokenResponse> {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}/api/github/token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

export async function listGitHubRepos(): Promise<GitHubRepo[]> {
  const headers = { ...githubTokenHeader() };
  const res = await fetch(`${API_BASE}/api/github/repos`, { headers });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

export async function scanGitHubRepo(repoUrl: string): Promise<GitHubScanResponse> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()), ...githubTokenHeader() };
  const res = await fetch(`${API_BASE}/api/github/scan`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ repoUrl }),
  });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

export async function parseGitHubProject(repoUrl: string, projectPath: string): Promise<ParseResponse> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()), ...githubTokenHeader() };
  const res = await fetch(`${API_BASE}/api/github/parse`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ repoUrl, projectPath }),
  });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

// ─── AI Assistant API ─────────────────────────────────────────────────────────

export async function getAiStatus(): Promise<AiStatusResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/ai/status`, { headers });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

export async function listAiModels(): Promise<AiModelsResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/ai/models`, { headers });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}

export async function sendAiChat(request: AiChatRequest): Promise<AiChatResponse> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }
  return res.json();
}
