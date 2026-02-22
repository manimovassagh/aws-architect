import type { CloudProvider, ParseResponse, ApiError } from '@infragraph/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function parseFile(file: File, provider?: CloudProvider): Promise<ParseResponse> {
  const form = new FormData();
  form.append('tfstate', file);

  const params = provider ? `?provider=${provider}` : '';
  const res = await fetch(`${API_BASE}/api/parse${params}`, { method: 'POST', body: form });

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
  const res = await fetch(`${API_BASE}/api/parse/hcl${params}`, { method: 'POST', body: form });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }

  return res.json();
}

export async function parseRaw(tfstate: string, provider?: CloudProvider): Promise<ParseResponse> {
  const params = provider ? `?provider=${provider}` : '';
  const res = await fetch(`${API_BASE}/api/parse/raw${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tfstate }),
  });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }

  return res.json();
}
