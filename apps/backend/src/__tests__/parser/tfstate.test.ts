import { describe, it, expect } from 'vitest';
import { parseTfstate, extractResources } from '../../parser/tfstate.js';
import { awsProvider } from '../../providers/aws.js';
import type { Tfstate } from '@infragraph/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── parseTfstate ────────────────────────────────────────────────────────────

describe('parseTfstate', () => {
  it('parses valid tfstate JSON string', () => {
    const raw = JSON.stringify({
      version: 4,
      terraform_version: '1.6.0',
      resources: [],
    });
    const result = parseTfstate(raw);
    expect(result.version).toBe(4);
    expect(result.resources).toEqual([]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseTfstate('not json')).toThrow('File is not valid JSON');
  });

  it('throws on non-object JSON', () => {
    expect(() => parseTfstate('"just a string"')).toThrow(
      'tfstate must be a JSON object'
    );
  });

  it('throws on null JSON', () => {
    expect(() => parseTfstate('null')).toThrow('tfstate must be a JSON object');
  });

  it('throws on missing version field', () => {
    expect(() => parseTfstate('{"resources": []}')).toThrow(
      'Missing "version" field'
    );
  });

  it('throws on missing resources array', () => {
    expect(() => parseTfstate('{"version": 4}')).toThrow(
      'Missing or invalid "resources" array'
    );
  });

  it('throws on resources not being an array', () => {
    expect(() =>
      parseTfstate('{"version": 4, "resources": "not-array"}')
    ).toThrow('Missing or invalid "resources" array');
  });
});

// ─── extractResources ────────────────────────────────────────────────────────

describe('extractResources', () => {
  const fixture = JSON.parse(
    readFileSync(
      resolve(import.meta.dirname!, '../../fixtures/sample.tfstate'),
      'utf-8'
    )
  ) as Tfstate;

  it('extracts all managed resources from sample fixture', () => {
    const { resources } = extractResources(fixture, awsProvider);
    expect(resources.length).toBe(11);
  });

  it('returns no warnings for a clean fixture', () => {
    const { warnings } = extractResources(fixture, awsProvider);
    expect(warnings).toEqual([]);
  });

  it('uses correct IDs in type.name format', () => {
    const { resources } = extractResources(fixture, awsProvider);
    const ids = resources.map((r) => r.id);
    expect(ids).toContain('aws_vpc.main');
    expect(ids).toContain('aws_instance.web');
    expect(ids).toContain('aws_s3_bucket.assets');
  });

  it('extracts display names from Name tags', () => {
    const { resources } = extractResources(fixture, awsProvider);
    const vpc = resources.find((r) => r.id === 'aws_vpc.main')!;
    expect(vpc.displayName).toBe('main-vpc');
  });

  it('extracts tags correctly', () => {
    const { resources } = extractResources(fixture, awsProvider);
    const vpc = resources.find((r) => r.id === 'aws_vpc.main')!;
    expect(vpc.tags).toEqual({ Name: 'main-vpc', Environment: 'dev' });
  });

  it('skips data sources', () => {
    const stateWithData: Tfstate = {
      version: 4,
      terraform_version: '1.6.0',
      resources: [
        {
          mode: 'data',
          type: 'aws_ami',
          name: 'latest',
          provider: 'provider["registry.terraform.io/hashicorp/aws"]',
          instances: [
            {
              schema_version: 0,
              attributes: { id: 'ami-123' },
            },
          ],
        },
      ],
    };
    const { resources } = extractResources(stateWithData, awsProvider);
    expect(resources).toHaveLength(0);
  });

  it('handles resources with multiple instances', () => {
    const multiInstance: Tfstate = {
      version: 4,
      terraform_version: '1.6.0',
      resources: [
        {
          mode: 'managed',
          type: 'aws_instance',
          name: 'workers',
          provider: 'provider["registry.terraform.io/hashicorp/aws"]',
          instances: [
            {
              schema_version: 1,
              attributes: { id: 'i-001', tags: { Name: 'worker-0' } },
            },
            {
              schema_version: 1,
              attributes: { id: 'i-002', tags: { Name: 'worker-1' } },
            },
          ],
        },
      ],
    };
    const { resources } = extractResources(multiInstance, awsProvider);
    expect(resources).toHaveLength(2);
    expect(resources[0]!.id).toBe('aws_instance.workers[0]');
    expect(resources[1]!.id).toBe('aws_instance.workers[1]');
  });

  it('filters dependencies to supported types only', () => {
    const { resources } = extractResources(fixture, awsProvider);
    const nat = resources.find((r) => r.id === 'aws_nat_gateway.nat')!;
    expect(nat.dependencies).toContain('aws_eip.nat_eip');
    expect(nat.dependencies).toContain('aws_subnet.public_1');
  });

  it('handles empty tfstate resources gracefully', () => {
    const empty: Tfstate = {
      version: 4,
      terraform_version: '1.6.0',
      resources: [],
    };
    const { resources, warnings } = extractResources(empty, awsProvider);
    expect(resources).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('extracts region from ARN attribute', () => {
    const arnState: Tfstate = {
      version: 4,
      terraform_version: '1.6.0',
      resources: [
        {
          mode: 'managed',
          type: 'aws_instance',
          name: 'test',
          provider: 'provider["registry.terraform.io/hashicorp/aws"]',
          instances: [
            {
              schema_version: 1,
              attributes: {
                id: 'i-123',
                arn: 'arn:aws:ec2:us-west-2:123456789012:instance/i-123',
              },
            },
          ],
        },
      ],
    };
    const { resources } = extractResources(arnState, awsProvider);
    expect(resources[0]!.region).toBe('us-west-2');
  });

  it('returns undefined region when no ARN present', () => {
    const { resources } = extractResources(fixture, awsProvider);
    const vpc = resources.find((r) => r.id === 'aws_vpc.main')!;
    expect(vpc.region).toBeUndefined();
  });

  it('assigns correct resource types', () => {
    const { resources } = extractResources(fixture, awsProvider);
    const types = new Set(resources.map((r) => r.type));
    expect(types).toContain('aws_vpc');
    expect(types).toContain('aws_subnet');
    expect(types).toContain('aws_instance');
    expect(types).toContain('aws_db_instance');
    expect(types).toContain('aws_s3_bucket');
  });
});
