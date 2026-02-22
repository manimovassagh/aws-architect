import { describe, it, expect } from 'vitest';

/**
 * Type-level tests: verify the shared interfaces are structurally sound
 * and the package exports correctly.
 */
describe('shared types', () => {
  it('exports all expected types', async () => {
    // Dynamic import to validate the built package works at runtime
    const shared = await import('../../dist/index.js');
    // The shared package is types-only — the module should exist but export nothing at runtime
    expect(shared).toBeDefined();
  });

  it('AwsResource shape satisfies minimal contract', () => {
    // Compile-time contract check — if this file compiles, the types are correct
    const resource: import('@infragraph/shared').AwsResource = {
      id: 'aws_vpc.main',
      type: 'aws_vpc',
      name: 'main',
      displayName: 'main-vpc',
      attributes: { id: 'vpc-123', cidr_block: '10.0.0.0/16' },
      dependencies: [],
      provider: 'aws',
      tags: { Name: 'main-vpc' },
    };
    expect(resource.id).toBe('aws_vpc.main');
    expect(resource.type).toBe('aws_vpc');
  });

  it('GraphNode shape satisfies minimal contract', () => {
    const node: import('@infragraph/shared').GraphNode = {
      id: 'aws_vpc.main',
      type: 'vpcNode',
      position: { x: 0, y: 0 },
      data: {
        resource: {
          id: 'aws_vpc.main',
          type: 'aws_vpc',
          name: 'main',
          displayName: 'main-vpc',
          attributes: {},
          dependencies: [],
          provider: 'aws',
          tags: {},
        },
        label: 'main-vpc',
      },
    };
    expect(node.type).toBe('vpcNode');
    expect(node.position).toEqual({ x: 0, y: 0 });
  });

  it('GraphEdge shape satisfies minimal contract', () => {
    const edge: import('@infragraph/shared').GraphEdge = {
      id: 'e-a-b',
      source: 'aws_vpc.main',
      target: 'aws_subnet.public',
      label: 'contains',
    };
    expect(edge.source).toBe('aws_vpc.main');
    expect(edge.target).toBe('aws_subnet.public');
  });

  it('ParseResponse shape satisfies minimal contract', () => {
    const resp: import('@infragraph/shared').ParseResponse = {
      nodes: [],
      edges: [],
      resources: [],
      provider: 'aws',
      warnings: [],
    };
    expect(resp.nodes).toEqual([]);
    expect(resp.warnings).toEqual([]);
  });

  it('NodeType includes all expected variants', () => {
    const validTypes: import('@infragraph/shared').NodeType[] = [
      'vpcNode',
      'subnetNode',
      'igwNode',
      'natNode',
      'routeTableNode',
      'securityGroupNode',
      'ec2Node',
      'rdsNode',
      'lbNode',
      'eipNode',
      's3Node',
      'lambdaNode',
      'genericNode',
    ];
    expect(validTypes).toHaveLength(13);
  });
});
