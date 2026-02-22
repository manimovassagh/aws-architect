import { parse } from '@cdktf/hcl2json';
import type { CloudResource, ProviderConfig } from '@infragraph/shared';

/**
 * Parse HCL .tf files and extract CloudResources compatible with buildGraphFromResources().
 *
 * @param files Map of filename → file content
 * @param provider Provider config for reference resolution
 */
export async function extractResourcesFromHcl(
  files: Map<string, string>,
  provider: ProviderConfig,
): Promise<{ resources: CloudResource[]; warnings: string[] }> {
  const warnings: string[] = [];
  const resources: CloudResource[] = [];

  // Parse each file individually and deep-merge the results
  let parsed: Record<string, unknown> = {};
  try {
    for (const [name, content] of files) {
      const fileResult = await parse(name, content);
      parsed = deepMerge(parsed, fileResult);
    }
  } catch (err) {
    throw new Error(
      `Failed to parse HCL: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  const resourceBlocks = parsed['resource'] as
    | Record<string, Record<string, Record<string, unknown>>>
    | undefined;

  if (!resourceBlocks) {
    warnings.push('No resource blocks found in HCL files');
    return { resources, warnings };
  }

  // Derive ref attribute keys from provider's edge attributes
  const refAttrs = provider.edgeAttributes.map(([attr]) => attr);

  // resourceBlocks shape: { "aws_vpc": { "main": { cidr_block: "..." } }, ... }
  for (const [resourceType, instances] of Object.entries(resourceBlocks)) {
    for (const [resourceName, rawAttrs] of Object.entries(instances)) {
      const tfId = `${resourceType}.${resourceName}`;
      const attrs = flattenHclAttrs(rawAttrs as Record<string, unknown>);

      // Set the 'id' attribute to the Terraform ID (no physical cloud ID in HCL)
      attrs['id'] = tfId;

      // Resolve Terraform expression references in known ref attributes
      resolveRefs(attrs, refAttrs, provider.refPattern);

      const tags = extractTags(attrs);
      const displayName =
        tags['Name'] ??
        (typeof attrs['name'] === 'string' && attrs['name']
          ? attrs['name']
          : resourceName);

      const dependencies = extractDependencies(attrs, refAttrs, provider.refPattern);

      resources.push({
        id: tfId,
        type: resourceType,
        name: resourceName,
        displayName,
        attributes: attrs,
        dependencies,
        provider: provider.id,
        tags,
      });
    }
  }

  return { resources, warnings };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * hcl2json wraps resource bodies in arrays: `{ "0": { vpc_id: "..." } }`
 * or `[{ vpc_id: "..." }]`. This function unwraps the body to get the
 * actual attributes, then recursively flattens single-element arrays
 * (hcl2json wraps scalar values in `[value]`).
 */
function flattenHclAttrs(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  // hcl2json may wrap the resource body in an array or indexed object.
  // Detect `{ "0": { ... } }` pattern where "0" holds the real attrs.
  let unwrapped = raw;
  if ('0' in raw && typeof raw['0'] === 'object' && raw['0'] !== null && !Array.isArray(raw['0'])) {
    unwrapped = raw['0'] as Record<string, unknown>;
  }

  return flattenValues(unwrapped);
}

function flattenValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      if (value.length === 1 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
        // Single-element array wrapping an object → unwrap and recurse (e.g. tags: [{Name: "..."}])
        result[key] = flattenValues(value[0] as Record<string, unknown>);
      } else if (value.length === 1 && !Array.isArray(value[0])) {
        // Single scalar wrapped in array → unwrap
        result[key] = value[0];
      } else {
        // Real array (e.g. subnet_ids, security_groups) — flatten each element
        result[key] = value.map((v) => {
          if (Array.isArray(v) && v.length === 1) return v[0];
          return v;
        });
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Resolve HCL expression references like "${aws_vpc.main.id}" or
 * "aws_vpc.main.id" to the Terraform ID "aws_vpc.main".
 * Only processes known reference attributes.
 */
function resolveRefs(attrs: Record<string, unknown>, refAttrs: string[], refPattern: RegExp): void {
  for (const key of refAttrs) {
    const val = attrs[key];
    if (typeof val === 'string') {
      attrs[key] = resolveExpression(val, refPattern);
    } else if (Array.isArray(val)) {
      attrs[key] = val.map((v) =>
        typeof v === 'string' ? resolveExpression(v, refPattern) : v,
      );
    }
  }
}

/**
 * Convert a Terraform expression like "${aws_vpc.main.id}" to "aws_vpc.main".
 * Handles both interpolation syntax and bare references.
 */
function resolveExpression(expr: string, refPattern: RegExp): string {
  // Strip ${ ... } wrapper
  const cleaned = expr.replace(/^\$\{(.+)\}$/, '$1').trim();
  // Match resource reference pattern using provider-specific regex
  const match = cleaned.match(refPattern);
  if (match) {
    return `${match[1]}.${match[2]}`;
  }
  return expr;
}

/**
 * Extract dependencies from attrs by scanning ref attributes for resource refs.
 */
function extractDependencies(
  attrs: Record<string, unknown>,
  refAttrs: string[],
  refPattern: RegExp,
): string[] {
  const deps = new Set<string>();
  for (const key of refAttrs) {
    const val = attrs[key];
    if (typeof val === 'string' && refPattern.test(val)) {
      // Extract just the type.name part
      const match = val.match(refPattern);
      if (match) deps.add(`${match[1]}.${match[2]}`);
    } else if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === 'string' && refPattern.test(v)) {
          const match = v.match(refPattern);
          if (match) deps.add(`${match[1]}.${match[2]}`);
        }
      }
    }
  }
  return Array.from(deps);
}

function extractTags(
  attrs: Record<string, unknown>,
): Record<string, string> {
  const raw = attrs['tags'] ?? attrs['tags_all'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
      k,
      String(v),
    ]),
  );
}

/**
 * Deep-merge two parsed HCL objects. For nested objects (like resource blocks),
 * merge keys recursively. For arrays, concatenate.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const [key, srcVal] of Object.entries(source)) {
    const tgtVal = result[key];
    if (
      tgtVal && srcVal &&
      typeof tgtVal === 'object' && !Array.isArray(tgtVal) &&
      typeof srcVal === 'object' && !Array.isArray(srcVal)
    ) {
      result[key] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else {
      result[key] = srcVal;
    }
  }
  return result;
}
