import yaml from 'js-yaml';
import type { CloudResource, ProviderConfig } from '@infragraph/shared';
import { cfnTypeMap, cfnPropertyMap, cfnGlueResources } from './cfn-type-mapping.js';

// ─── CloudFormation YAML Schema ──────────────────────────────────────────────
// CFN YAML uses custom tags like !Ref, !GetAtt, !Sub, etc. We define a schema
// that converts these to their JSON-equivalent intrinsic function objects.

const cfnTags = [
  new yaml.Type('!Ref', { kind: 'scalar', construct: (data) => ({ Ref: data }) }),
  new yaml.Type('!GetAtt', {
    kind: 'scalar',
    construct: (data: string) => {
      const [logicalId, ...rest] = data.split('.');
      return { 'Fn::GetAtt': [logicalId, rest.join('.')] };
    },
  }),
  new yaml.Type('!GetAtt', {
    kind: 'sequence',
    construct: (data) => ({ 'Fn::GetAtt': data }),
  }),
  new yaml.Type('!Sub', { kind: 'scalar', construct: (data) => ({ 'Fn::Sub': data }) }),
  new yaml.Type('!Sub', { kind: 'sequence', construct: (data) => ({ 'Fn::Sub': data }) }),
  new yaml.Type('!Join', { kind: 'sequence', construct: (data) => ({ 'Fn::Join': data }) }),
  new yaml.Type('!Select', { kind: 'sequence', construct: (data) => ({ 'Fn::Select': data }) }),
  new yaml.Type('!Split', { kind: 'sequence', construct: (data) => ({ 'Fn::Split': data }) }),
  new yaml.Type('!If', { kind: 'sequence', construct: (data) => ({ 'Fn::If': data }) }),
  new yaml.Type('!Equals', { kind: 'sequence', construct: (data) => ({ 'Fn::Equals': data }) }),
  new yaml.Type('!And', { kind: 'sequence', construct: (data) => ({ 'Fn::And': data }) }),
  new yaml.Type('!Or', { kind: 'sequence', construct: (data) => ({ 'Fn::Or': data }) }),
  new yaml.Type('!Not', { kind: 'sequence', construct: (data) => ({ 'Fn::Not': data }) }),
  new yaml.Type('!FindInMap', { kind: 'sequence', construct: (data) => ({ 'Fn::FindInMap': data }) }),
  new yaml.Type('!Base64', { kind: 'scalar', construct: (data) => ({ 'Fn::Base64': data }) }),
  new yaml.Type('!Cidr', { kind: 'sequence', construct: (data) => ({ 'Fn::Cidr': data }) }),
  new yaml.Type('!ImportValue', { kind: 'scalar', construct: (data) => ({ 'Fn::ImportValue': data }) }),
  new yaml.Type('!GetAZs', { kind: 'scalar', construct: (data) => ({ 'Fn::GetAZs': data || '' }) }),
  new yaml.Type('!Condition', { kind: 'scalar', construct: (data) => ({ Condition: data }) }),
];

const CFN_SCHEMA = yaml.DEFAULT_SCHEMA.extend(cfnTags);

// ─── CloudFormation Template Shape ───────────────────────────────────────────

export interface CfnTemplate {
  AWSTemplateFormatVersion?: string;
  Description?: string;
  Parameters?: Record<string, unknown>;
  Resources: Record<string, CfnResource>;
  Outputs?: Record<string, unknown>;
}

export interface CfnResource {
  Type: string;
  Properties?: Record<string, unknown>;
  DependsOn?: string | string[];
}

// Pseudo-parameters that Ref can reference (not real resources)
const PSEUDO_PARAMS = new Set([
  'AWS::AccountId',
  'AWS::NotificationARNs',
  'AWS::NoValue',
  'AWS::Partition',
  'AWS::Region',
  'AWS::StackId',
  'AWS::StackName',
  'AWS::URLSuffix',
]);

// ─── Parse raw template string ───────────────────────────────────────────────

export function parseCfnTemplate(raw: string): CfnTemplate {
  let parsed: unknown;

  // Try JSON first, then YAML
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      parsed = yaml.load(raw, { schema: CFN_SCHEMA });
    } catch (yamlErr) {
      throw new Error(
        `Template is not valid JSON or YAML: ${yamlErr instanceof Error ? yamlErr.message : String(yamlErr)}`,
      );
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('CloudFormation template must be a JSON/YAML object');
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj['Resources'] || typeof obj['Resources'] !== 'object' || Array.isArray(obj['Resources'])) {
    throw new Error('Missing or invalid "Resources" block in CloudFormation template');
  }

  return obj as unknown as CfnTemplate;
}

// ─── Extract CloudResources from CFN template ────────────────────────────────

import { SENSITIVE_ATTR_PATTERNS } from './utils.js';

export function extractResourcesFromCfn(
  template: CfnTemplate,
  provider: ProviderConfig,
): { resources: CloudResource[]; warnings: string[] } {
  const warnings: string[] = [];
  const resources: CloudResource[] = [];

  // Collect NoEcho parameter names
  const noEchoParams = new Set<string>();
  if (template.Parameters) {
    for (const [name, param] of Object.entries(template.Parameters)) {
      if (typeof param === 'object' && param !== null && (param as Record<string, unknown>)['NoEcho'] === true) {
        noEchoParams.add(name);
      }
    }
  }

  // Build a lookup: logical ID → CFN type (for resolving Ref targets)
  const logicalIdToType = new Map<string, string>();
  for (const [logicalId, cfnRes] of Object.entries(template.Resources)) {
    logicalIdToType.set(logicalId, cfnRes.Type);
  }

  // Build a lookup: logical ID → Terraform ID (for dependency resolution)
  const logicalIdToTfId = new Map<string, string>();
  for (const [logicalId, cfnRes] of Object.entries(template.Resources)) {
    const tfType = cfnTypeMap[cfnRes.Type];
    if (tfType) {
      logicalIdToTfId.set(logicalId, `${tfType}.${logicalId}`);
    }
  }

  // First pass: process glue resources and collect their merge instructions
  const mergeOps: { targetLogicalId: string; attr: string; valueLogicalId: string }[] = [];
  for (const [, cfnRes] of Object.entries(template.Resources)) {
    const glue = cfnGlueResources[cfnRes.Type];
    if (!glue) continue;

    const props = cfnRes.Properties ?? {};
    const targetRef = resolveRef(props[glue.targetRef]);
    const valueRef = resolveRef(props[glue.valueRef]);

    if (targetRef && valueRef) {
      mergeOps.push({
        targetLogicalId: targetRef,
        attr: glue.mergeAttr,
        valueLogicalId: valueRef,
      });
    }
  }

  // Second pass: create CloudResource for each non-glue resource
  for (const [logicalId, cfnRes] of Object.entries(template.Resources)) {
    // Skip glue resources
    if (cfnGlueResources[cfnRes.Type]) continue;

    const tfType = cfnTypeMap[cfnRes.Type];
    if (!tfType) {
      warnings.push(`Unsupported CloudFormation type: ${cfnRes.Type} (${logicalId})`);
      continue;
    }

    const tfId = `${tfType}.${logicalId}`;
    const props = cfnRes.Properties ?? {};
    const propMap = cfnPropertyMap[cfnRes.Type] ?? {};

    // Convert CFN properties → Terraform-style attributes
    const attrs: Record<string, unknown> = { id: tfId };
    for (const [cfnKey, cfnValue] of Object.entries(props)) {
      const tfAttr = propMap[cfnKey] ?? camelToSnake(cfnKey);
      const resolved = resolveValue(cfnValue, logicalIdToTfId);
      attrs[tfAttr] = resolved;
    }

    // Extract tags
    const tags = extractTags(props);

    // Extract dependencies from Ref/Fn::GetAtt in properties + DependsOn
    const dependencies = extractDependencies(props, cfnRes.DependsOn, logicalIdToTfId);

    // Display name: Name tag → logical ID
    const displayName = tags['Name'] ?? logicalId;

    // Detect sensitive keys: NoEcho parameter refs + common sensitive patterns
    const sensitiveKeys: string[] = [];
    for (const [cfnKey, cfnValue] of Object.entries(props)) {
      const tfAttr = propMap[cfnKey] ?? camelToSnake(cfnKey);
      // Check if the value references a NoEcho parameter
      if (typeof cfnValue === 'object' && cfnValue !== null) {
        const ref = (cfnValue as Record<string, unknown>)['Ref'];
        if (typeof ref === 'string' && noEchoParams.has(ref)) {
          sensitiveKeys.push(tfAttr);
        }
      }
      // Check against common sensitive patterns
      const lower = tfAttr.toLowerCase();
      if (SENSITIVE_ATTR_PATTERNS.some((p) => lower.includes(p))) {
        if (!sensitiveKeys.includes(tfAttr)) sensitiveKeys.push(tfAttr);
      }
    }

    resources.push({
      id: tfId,
      type: tfType,
      name: logicalId,
      displayName,
      attributes: attrs,
      dependencies,
      provider: provider.id,
      tags,
      region: provider.extractRegion(attrs),
      ...(sensitiveKeys.length > 0 ? { sensitiveKeys } : {}),
    });
  }

  // Apply glue resource merge operations
  for (const op of mergeOps) {
    const targetTfId = logicalIdToTfId.get(op.targetLogicalId);
    const valueTfId = logicalIdToTfId.get(op.valueLogicalId);
    if (!targetTfId || !valueTfId) continue;

    const target = resources.find((r) => r.id === targetTfId);
    if (target) {
      target.attributes[op.attr] = valueTfId;
    }
  }

  return { resources, warnings };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract a logical ID from a Ref intrinsic. Returns undefined if not a Ref
 * or if it references a pseudo-parameter.
 */
function resolveRef(value: unknown): string | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj['Ref'] === 'string' && !PSEUDO_PARAMS.has(obj['Ref'])) {
      return obj['Ref'];
    }
  }
  return undefined;
}

/**
 * Recursively resolve CFN intrinsic functions to either Terraform IDs or
 * leave as raw values. Handles Ref and Fn::GetAtt.
 */
function resolveValue(
  value: unknown,
  logicalIdToTfId: Map<string, string>,
): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // { "Ref": "LogicalId" } → resolved Terraform ID
    if (typeof obj['Ref'] === 'string') {
      if (PSEUDO_PARAMS.has(obj['Ref'])) return obj['Ref'];
      return logicalIdToTfId.get(obj['Ref']) ?? obj['Ref'];
    }

    // { "Fn::GetAtt": ["LogicalId", "Attribute"] } → resolved Terraform ID
    if (Array.isArray(obj['Fn::GetAtt']) && obj['Fn::GetAtt'].length === 2) {
      const [logicalId] = obj['Fn::GetAtt'] as [string, string];
      return logicalIdToTfId.get(logicalId) ?? logicalId;
    }

    // Other objects: recurse into values
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = resolveValue(v, logicalIdToTfId);
    }
    return result;
  }

  if (Array.isArray(value)) {
    return value.map((v) => resolveValue(v, logicalIdToTfId));
  }

  return value;
}

/**
 * Extract dependencies from CFN properties by walking for Ref and Fn::GetAtt,
 * and from explicit DependsOn.
 */
function extractDependencies(
  props: Record<string, unknown>,
  dependsOn: string | string[] | undefined,
  logicalIdToTfId: Map<string, string>,
): string[] {
  const deps = new Set<string>();

  // Walk properties for Ref / Fn::GetAtt
  walkRefs(props, (logicalId) => {
    const tfId = logicalIdToTfId.get(logicalId);
    if (tfId) deps.add(tfId);
  });

  // Explicit DependsOn
  if (dependsOn) {
    const arr = Array.isArray(dependsOn) ? dependsOn : [dependsOn];
    for (const dep of arr) {
      const tfId = logicalIdToTfId.get(dep);
      if (tfId) deps.add(tfId);
    }
  }

  return Array.from(deps);
}

/** Recursively walk a value tree and call `cb` for every Ref/GetAtt logical ID found. */
function walkRefs(value: unknown, cb: (logicalId: string) => void): void {
  if (value === null || value === undefined || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const item of value) walkRefs(item, cb);
    return;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj['Ref'] === 'string' && !PSEUDO_PARAMS.has(obj['Ref'])) {
    cb(obj['Ref']);
    return;
  }

  if (Array.isArray(obj['Fn::GetAtt']) && obj['Fn::GetAtt'].length === 2) {
    const [logicalId] = obj['Fn::GetAtt'] as [string, string];
    if (typeof logicalId === 'string') cb(logicalId);
    return;
  }

  for (const v of Object.values(obj)) {
    walkRefs(v, cb);
  }
}

/** Extract CloudFormation Tags from Properties. CFN tags are [{Key, Value}]. */
function extractTags(props: Record<string, unknown>): Record<string, string> {
  const rawTags = props['Tags'];
  if (!Array.isArray(rawTags)) return {};

  const tags: Record<string, string> = {};
  for (const tag of rawTags) {
    if (typeof tag === 'object' && tag !== null) {
      const t = tag as Record<string, unknown>;
      if (typeof t['Key'] === 'string' && typeof t['Value'] === 'string') {
        tags[t['Key']] = t['Value'];
      }
    }
  }
  return tags;
}

/** Convert PascalCase/camelCase to snake_case */
function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}
