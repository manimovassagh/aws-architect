import type { ParseResponse, ApiError } from '@awsarchitect/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function parseFile(file: File): Promise<ParseResponse> {
  const form = new FormData();
  form.append('tfstate', file);

  const res = await fetch(`${API_BASE}/api/parse`, { method: 'POST', body: form });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }

  return res.json();
}

export async function parseHcl(files: File[]): Promise<ParseResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }

  const res = await fetch(`${API_BASE}/api/parse/hcl`, { method: 'POST', body: form });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(err.details ?? err.error);
  }

  return res.json();
}

export async function parseRaw(tfstate: string): Promise<ParseResponse> {
  const res = await fetch(`${API_BASE}/api/parse/raw`, {
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
