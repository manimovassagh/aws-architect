/** Common attribute keys that contain sensitive values. */
export const SENSITIVE_ATTR_PATTERNS = [
  'password', 'secret', 'private_key', 'access_key', 'secret_key',
  'token', 'api_key', 'auth', 'credential',
];

/** Extract tags from a resource's attributes record. */
export function extractTags(attrs: Record<string, unknown>): Record<string, string> {
  const raw = attrs['tags'] ?? attrs['tags_all'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}
