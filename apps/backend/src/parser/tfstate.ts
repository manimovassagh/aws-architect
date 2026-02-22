import type {
  Tfstate,
  TfstateResource,
  CloudResource,
  ProviderConfig,
} from '@infragraph/shared';

// ─── Parse raw JSON string into Tfstate ──────────────────────────────────────

export function parseTfstate(raw: string): Tfstate {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('File is not valid JSON');
  }

  if (typeof json !== 'object' || json === null) {
    throw new Error('tfstate must be a JSON object');
  }

  const obj = json as Record<string, unknown>;

  if (obj['version'] === undefined) {
    throw new Error('Missing "version" field — is this a valid tfstate file?');
  }

  if (!Array.isArray(obj['resources'])) {
    throw new Error('Missing or invalid "resources" array in tfstate');
  }

  return obj as unknown as Tfstate;
}

// ─── Extract CloudResources from Tfstate ─────────────────────────────────────

export function extractResources(tfstate: Tfstate, provider: ProviderConfig): {
  resources: CloudResource[];
  warnings: string[];
} {
  const resources: CloudResource[] = [];
  const warnings: string[] = [];

  for (const tfResource of tfstate.resources) {
    // Skip data sources
    if (tfResource.mode !== 'managed') continue;

    for (let i = 0; i < tfResource.instances.length; i++) {
      const instance = tfResource.instances[i];
      if (!instance) continue;

      const suffix = tfResource.instances.length > 1 ? `[${i}]` : '';
      const id = `${tfResource.type}.${tfResource.name}${suffix}`;

      // Normalize dependency references (they come as "type.name" strings)
      const dependencies = (instance.dependencies ?? [])
        .filter((dep) => provider.supportedTypes.has(dep.split('.')[0] ?? ''));

      const attrs = instance.attributes ?? {};
      const tags = extractTags(attrs);
      const displayName = inferDisplayName(tfResource, attrs, tags);

      resources.push({
        id,
        type: tfResource.type,
        name: tfResource.name,
        displayName,
        attributes: attrs,
        dependencies,
        provider: provider.id,
        tags,
        region: provider.extractRegion(attrs),
      });
    }
  }

  return { resources, warnings };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTags(attrs: Record<string, unknown>): Record<string, string> {
  const raw = attrs['tags'] ?? attrs['tags_all'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)])
  );
}

function inferDisplayName(
  tfResource: TfstateResource,
  attrs: Record<string, unknown>,
  tags: Record<string, string>
): string {
  // Prefer Name tag → terraform name → id attribute → type.name
  if (tags['Name']) return tags['Name'];
  if (typeof attrs['name'] === 'string' && attrs['name']) return attrs['name'];
  if (typeof attrs['id'] === 'string' && attrs['id']) return attrs['id'];
  return `${tfResource.type}.${tfResource.name}`;
}
