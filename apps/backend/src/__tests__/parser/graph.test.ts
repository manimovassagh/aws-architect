import { describe, it, expect } from 'vitest';
import { buildGraph } from '../../parser/graph.js';
import type { Tfstate } from '@awsarchitect/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname!, '../../fixtures/sample.tfstate'),
    'utf-8'
  )
) as Tfstate;

describe('buildGraph', () => {
  const result = buildGraph(fixture);

  // ─── Node generation ──────────────────────────────────────────────

  it('creates a node for every resource', () => {
    expect(result.nodes.length).toBeGreaterThanOrEqual(10);
  });

  it('produces no duplicate node IDs', () => {
    const ids = result.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assigns correct node types', () => {
    const vpc = result.nodes.find((n) => n.id === 'aws_vpc.main')!;
    expect(vpc.type).toBe('vpcNode');

    const ec2 = result.nodes.find((n) => n.id === 'aws_instance.web')!;
    expect(ec2.type).toBe('ec2Node');

    const rds = result.nodes.find((n) => n.id === 'aws_db_instance.postgres')!;
    expect(rds.type).toBe('rdsNode');

    const s3 = result.nodes.find((n) => n.id === 'aws_s3_bucket.assets')!;
    expect(s3.type).toBe('s3Node');
  });

  it('maps unknown resource types to genericNode', () => {
    const customState: Tfstate = {
      version: 4,
      terraform_version: '1.6.0',
      resources: [
        {
          mode: 'managed',
          type: 'aws_kinesis_stream',
          name: 'events',
          provider: 'provider["registry.terraform.io/hashicorp/aws"]',
          instances: [
            {
              schema_version: 0,
              attributes: { id: 'arn:aws:kinesis:us-east-1:123:stream/events' },
            },
          ],
        },
      ],
    };
    const { nodes } = buildGraph(customState);
    expect(nodes[0]!.type).toBe('genericNode');
  });

  // ─── Edge generation ──────────────────────────────────────────────

  it('generates non-containment edges', () => {
    // Containment edges (in vpc, in subnet) are filtered out since parentNode
    // nesting already shows the relationship visually
    expect(result.edges.length).toBeGreaterThanOrEqual(3);
  });

  it('produces no duplicate edges', () => {
    const edgeKeys = result.edges.map((e) => `${e.source}|${e.target}`);
    expect(new Set(edgeKeys).size).toBe(edgeKeys.length);
  });

  it('filters out containment edges (parent-child)', () => {
    // igw→vpc is a containment edge (igw.parentNode === vpc), so it should be removed
    const igwToVpc = result.edges.find(
      (e) =>
        e.source === 'aws_internet_gateway.igw' &&
        e.target === 'aws_vpc.main'
    );
    expect(igwToVpc).toBeUndefined();

    // ec2→subnet is a containment edge, so it should be removed
    const ec2ToSubnet = result.edges.find(
      (e) =>
        e.source === 'aws_instance.web' &&
        e.target === 'aws_subnet.public_1'
    );
    expect(ec2ToSubnet).toBeUndefined();
  });

  it('keeps non-containment edges like security group', () => {
    const ec2ToSg = result.edges.find(
      (e) =>
        e.source === 'aws_instance.web' &&
        e.target === 'aws_security_group.app_sg'
    );
    expect(ec2ToSg).toBeDefined();
    expect(ec2ToSg!.label).toBe('secured by');
  });

  // ─── Parent-child hierarchy ───────────────────────────────────────

  it('assigns subnets as children of VPC', () => {
    const subnet = result.nodes.find(
      (n) => n.id === 'aws_subnet.public_1'
    )!;
    expect(subnet.parentNode).toBe('aws_vpc.main');
  });

  it('assigns EC2 inside its subnet', () => {
    const ec2 = result.nodes.find((n) => n.id === 'aws_instance.web')!;
    expect(ec2.parentNode).toBe('aws_subnet.public_1');
  });

  it('assigns RDS inside its subnet', () => {
    const rds = result.nodes.find(
      (n) => n.id === 'aws_db_instance.postgres'
    )!;
    expect(rds.parentNode).toBe('aws_subnet.private_1');
  });

  it('places S3 at root level (no parent)', () => {
    const s3 = result.nodes.find((n) => n.id === 'aws_s3_bucket.assets')!;
    expect(s3.parentNode).toBeUndefined();
  });

  it('places VPC-attached resources (IGW, SG) inside VPC', () => {
    const igw = result.nodes.find(
      (n) => n.id === 'aws_internet_gateway.igw'
    )!;
    expect(igw.parentNode).toBe('aws_vpc.main');

    const sg = result.nodes.find(
      (n) => n.id === 'aws_security_group.app_sg'
    )!;
    expect(sg.parentNode).toBe('aws_vpc.main');
  });

  // ─── Layout ───────────────────────────────────────────────────────

  it('positions all nodes with x >= 0 and y >= 0', () => {
    for (const node of result.nodes) {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('assigns dimensions to VPC and subnet containers', () => {
    const vpc = result.nodes.find((n) => n.id === 'aws_vpc.main')!;
    expect(vpc.style?.width).toBeGreaterThan(0);
    expect(vpc.style?.height).toBeGreaterThan(0);

    const subnet = result.nodes.find(
      (n) => n.id === 'aws_subnet.public_1'
    )!;
    expect(subnet.style?.width).toBeGreaterThan(0);
    expect(subnet.style?.height).toBeGreaterThan(0);
  });

  // ─── Edge validity ────────────────────────────────────────────────

  it('all edge source/target IDs reference existing nodes', () => {
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    for (const edge of result.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  // ─── Empty state ──────────────────────────────────────────────────

  it('handles empty tfstate gracefully', () => {
    const empty: Tfstate = {
      version: 4,
      terraform_version: '1.6.0',
      resources: [],
    };
    const { nodes, edges, warnings } = buildGraph(empty);
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
