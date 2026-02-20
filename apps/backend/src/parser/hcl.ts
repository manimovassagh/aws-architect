import { parse } from '@cdktf/hcl2json';
import type { AwsResource, AwsResourceType } from '@awsarchitect/shared';

// Same set as tfstate.ts — keep in sync
const SUPPORTED_TYPES = new Set<string>([
  'aws_vpc', 'aws_subnet', 'aws_internet_gateway', 'aws_nat_gateway',
  'aws_route_table', 'aws_route_table_association', 'aws_security_group',
  'aws_instance', 'aws_db_instance', 'aws_lb', 'aws_alb',
  'aws_lb_target_group', 'aws_lb_listener', 'aws_eip', 'aws_s3_bucket',
  'aws_lambda_function', 'aws_ecs_cluster', 'aws_ecs_service',
  'aws_ecs_task_definition', 'aws_eks_cluster', 'aws_elasticache_cluster',
  'aws_sqs_queue', 'aws_sns_topic', 'aws_cloudfront_distribution',
  'aws_api_gateway_rest_api',
]);

// Attribute keys that carry references to other resources
const REF_ATTRS = [
  'vpc_id', 'subnet_id', 'subnet_ids', 'security_groups',
  'vpc_security_group_ids', 'nat_gateway_id', 'internet_gateway_id',
  'instance_id', 'allocation_id', 'load_balancer_arn', 'gateway_id',
];

/**
 * Parse HCL .tf files and extract AwsResources compatible with buildGraphFromResources().
 *
 * @param files Map of filename → file content
 */
export async function extractResourcesFromHcl(
  files: Map<string, string>,
): Promise<{ resources: AwsResource[]; warnings: string[] }> {
  const warnings: string[] = [];
  const resources: AwsResource[] = [];

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
    );
  }

  const resourceBlocks = parsed['resource'] as
    | Record<string, Record<string, Record<string, unknown>>>
    | undefined;

  if (!resourceBlocks) {
    warnings.push('No resource blocks found in HCL files');
    return { resources, warnings };
  }

  // resourceBlocks shape: { "aws_vpc": { "main": { cidr_block: "..." } }, ... }
  for (const [resourceType, instances] of Object.entries(resourceBlocks)) {
    for (const [resourceName, rawAttrs] of Object.entries(instances)) {
      const tfId = `${resourceType}.${resourceName}`;
      const attrs = flattenHclAttrs(rawAttrs as Record<string, unknown>);

      // Set the 'id' attribute to the Terraform ID (no physical AWS ID in HCL)
      attrs['id'] = tfId;

      // Resolve Terraform expression references in known ref attributes
      resolveRefs(attrs);

      const tags = extractTags(attrs);
      const displayName =
        tags['Name'] ??
        (typeof attrs['name'] === 'string' && attrs['name']
          ? attrs['name']
          : resourceName);

      const dependencies = extractDependencies(attrs);

      resources.push({
        id: tfId,
        type: (SUPPORTED_TYPES.has(resourceType)
          ? resourceType
          : 'unknown') as AwsResourceType,
        name: resourceName,
        displayName,
        attributes: attrs,
        dependencies,
        tags,
      });
    }
  }

  return { resources, warnings };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * hcl2json wraps single attribute values in arrays like [value].
 * Flatten them back to scalar values, keeping real arrays intact.
 */
function flattenHclAttrs(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value) && value.length === 1 && !Array.isArray(value[0])) {
      result[key] = value[0];
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Resolve HCL expression references like "${aws_vpc.main.id}" or
 * "aws_vpc.main.id" to the Terraform ID "aws_vpc.main".
 * Only processes known reference attributes (vpc_id, subnet_id, etc.).
 */
function resolveRefs(attrs: Record<string, unknown>): void {
  for (const key of REF_ATTRS) {
    const val = attrs[key];
    if (typeof val === 'string') {
      attrs[key] = resolveExpression(val);
    } else if (Array.isArray(val)) {
      attrs[key] = val.map((v) =>
        typeof v === 'string' ? resolveExpression(v) : v,
      );
    }
  }
}

/**
 * Convert a Terraform expression like "${aws_vpc.main.id}" to "aws_vpc.main".
 * Handles both interpolation syntax and bare references.
 */
function resolveExpression(expr: string): string {
  // Strip ${ ... } wrapper
  const cleaned = expr.replace(/^\$\{(.+)\}$/, '$1').trim();
  // Match resource reference pattern: type.name.attribute
  const match = cleaned.match(/^(aws_\w+)\.(\w+)(?:\.\w+)?$/);
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
): string[] {
  const deps = new Set<string>();
  for (const key of REF_ATTRS) {
    const val = attrs[key];
    if (typeof val === 'string' && /^aws_\w+\.\w+$/.test(val)) {
      deps.add(val);
    } else if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === 'string' && /^aws_\w+\.\w+$/.test(v)) {
          deps.add(v);
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
