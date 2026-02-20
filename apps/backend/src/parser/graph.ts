import type {
  Tfstate,
  AwsResource,
  GraphNode,
  GraphEdge,
  NodeType,
  ParseResponse,
} from '@awsarchitect/shared';
import { extractResources } from './tfstate.js';

// ─── NodeType mapping ─────────────────────────────────────────────────────────

function nodeTypeFor(resourceType: string): NodeType {
  switch (resourceType) {
    case 'aws_vpc':                   return 'vpcNode';
    case 'aws_subnet':                return 'subnetNode';
    case 'aws_internet_gateway':      return 'igwNode';
    case 'aws_nat_gateway':           return 'natNode';
    case 'aws_route_table':
    case 'aws_route_table_association': return 'routeTableNode';
    case 'aws_security_group':        return 'securityGroupNode';
    case 'aws_instance':              return 'ec2Node';
    case 'aws_db_instance':           return 'rdsNode';
    case 'aws_lb':
    case 'aws_alb':                   return 'lbNode';
    case 'aws_eip':                   return 'eipNode';
    case 'aws_s3_bucket':             return 's3Node';
    case 'aws_lambda_function':       return 'lambdaNode';
    default:                          return 'genericNode';
  }
}

// ─── Attribute keys that encode parent relationships ─────────────────────────
//
// Maps: attribute key → label for the resulting edge

const EDGE_ATTRS: [string, string][] = [
  ['vpc_id',                    'in vpc'],
  ['subnet_id',                 'in subnet'],
  ['security_groups',           'secured by'],
  ['vpc_security_group_ids',    'secured by'],
  ['nat_gateway_id',            'routes via'],
  ['internet_gateway_id',       'routes via'],
  ['instance_id',               'attached to'],
  ['allocation_id',             'uses eip'],
  ['load_balancer_arn',         'behind lb'],
];

// ─── Layout constants ─────────────────────────────────────────────────────────

const VPC_W = 900;
const VPC_H = 700;
const VPC_GAP = 60;

const SUBNET_W = 380;
const SUBNET_H = 280;
const SUBNET_PAD_X = 30;
const SUBNET_PAD_Y = 100;
const SUBNET_COL_GAP = 420;
const SUBNET_ROW_GAP = 320;

const RESOURCE_W = 200;
const RESOURCE_H = 90;
const RESOURCE_PAD_X = 20;
const RESOURCE_PAD_Y = 60;
const RESOURCE_COL_GAP = 230;
const RESOURCE_ROW_GAP = 120;

const ROOT_X = 980;
const ROOT_Y_GAP = 130;

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildGraph(tfstate: Tfstate): ParseResponse {
  const { resources, warnings } = extractResources(tfstate);

  // Pass 1: build a Map from AWS IDs (e.g. "vpc-0abc") → Terraform IDs (e.g. "aws_vpc.main")
  const awsIdToTfId = new Map<string, string>();
  for (const r of resources) {
    const awsId = r.attributes['id'];
    if (typeof awsId === 'string' && awsId) {
      awsIdToTfId.set(awsId, r.id);
    }
  }

  // Helper: resolve an AWS ID or Terraform ID to a known Terraform ID
  function resolve(value: string): string | undefined {
    if (awsIdToTfId.has(value)) return awsIdToTfId.get(value);
    // Already a Terraform ID (e.g. "aws_vpc.main") — validate it exists
    if (resources.some((r) => r.id === value)) return value;
    return undefined;
  }

  // Pass 2: build edges
  const seenEdges = new Set<string>();
  const edges: GraphEdge[] = [];

  function addEdge(source: string, target: string, label: string) {
    const key = `${source}|${target}`;
    if (seenEdges.has(key)) return;
    seenEdges.add(key);
    edges.push({ id: `e-${source}-${target}`, source, target, label, animated: false });
  }

  for (const r of resources) {
    // Attribute-based edges
    for (const [attrKey, edgeLabel] of EDGE_ATTRS) {
      const val = r.attributes[attrKey];
      if (!val) continue;

      const targets: string[] = Array.isArray(val)
        ? (val as unknown[]).filter((v): v is string => typeof v === 'string')
        : typeof val === 'string' ? [val] : [];

      for (const raw of targets) {
        const tfId = resolve(raw);
        if (tfId && tfId !== r.id) addEdge(r.id, tfId, edgeLabel);
      }
    }

    // Fallback: explicit dependencies array
    for (const dep of r.dependencies) {
      const tfId = resolve(dep);
      if (tfId && tfId !== r.id) addEdge(r.id, tfId, 'depends on');
    }
  }

  // Pass 3: determine parent assignments
  // parentOf[child.id] = parent.id
  const parentOf = new Map<string, string>();

  // Index VPCs and subnets for quick lookup
  const vpcByAwsId = new Map<string, string>(); // AWS vpc-id → tf id
  const subnetByAwsId = new Map<string, string>(); // AWS subnet-id → tf id

  for (const r of resources) {
    const awsId = r.attributes['id'];
    if (typeof awsId !== 'string') continue;
    if (r.type === 'aws_vpc') vpcByAwsId.set(awsId, r.id);
    if (r.type === 'aws_subnet') subnetByAwsId.set(awsId, r.id);
  }

  for (const r of resources) {
    if (r.type === 'aws_vpc') continue; // VPCs are root

    // Prefer subnet_id → place inside subnet
    const subnetId = r.attributes['subnet_id'];
    if (typeof subnetId === 'string' && subnetByAwsId.has(subnetId)) {
      parentOf.set(r.id, subnetByAwsId.get(subnetId)!);
      continue;
    }

    // subnet_ids[] — use first subnet
    const subnetIds = r.attributes['subnet_ids'];
    if (Array.isArray(subnetIds) && subnetIds.length > 0) {
      const first = subnetIds[0];
      if (typeof first === 'string' && subnetByAwsId.has(first)) {
        parentOf.set(r.id, subnetByAwsId.get(first)!);
        continue;
      }
    }

    // Place subnet inside its VPC
    if (r.type === 'aws_subnet') {
      const vpcId = r.attributes['vpc_id'];
      if (typeof vpcId === 'string' && vpcByAwsId.has(vpcId)) {
        parentOf.set(r.id, vpcByAwsId.get(vpcId)!);
        continue;
      }
    }

    // Place VPC-attached resources (IGW, SG, NAT, route tables) inside VPC
    const vpcId = r.attributes['vpc_id'];
    if (typeof vpcId === 'string' && vpcByAwsId.has(vpcId)) {
      parentOf.set(r.id, vpcByAwsId.get(vpcId)!);
    }
  }

  // Pass 4: layout — collect children per parent
  const childrenOf = new Map<string, string[]>();
  const rootResources: AwsResource[] = [];

  for (const r of resources) {
    const p = parentOf.get(r.id);
    if (p) {
      if (!childrenOf.has(p)) childrenOf.set(p, []);
      childrenOf.get(p)!.push(r.id);
    } else if (r.type !== 'aws_vpc') {
      rootResources.push(r);
    }
  }

  // Separate VPCs
  const vpcs = resources.filter((r) => r.type === 'aws_vpc');

  // Build nodes
  const nodesMap = new Map<string, GraphNode>();

  // VPC nodes
  let vpcYOffset = 0;
  vpcs.forEach((vpc) => {
    // Subnets inside this VPC
    const subnets = resources.filter(
      (r) => r.type === 'aws_subnet' && parentOf.get(r.id) === vpc.id
    );
    const subnetRows = Math.ceil(subnets.length / 2) || 0;

    // VPC-direct children (IGW, SG, NAT not in a subnet)
    const vpcDirectChildren = resources.filter(
      (r) =>
        parentOf.get(r.id) === vpc.id &&
        r.type !== 'aws_subnet'
    );
    const directRows = Math.ceil(vpcDirectChildren.length / 3) || 0;

    // Calculate VPC height dynamically
    const subnetsBottom = subnetRows > 0
      ? SUBNET_PAD_Y + (subnetRows - 1) * SUBNET_ROW_GAP + SUBNET_H
      : SUBNET_PAD_Y;
    const directChildrenBottom = directRows > 0
      ? subnetsBottom + 40 + (directRows - 1) * RESOURCE_ROW_GAP + RESOURCE_H
      : subnetsBottom;
    const vpcH = Math.max(VPC_H, directChildrenBottom + 40);

    nodesMap.set(vpc.id, {
      id: vpc.id,
      type: 'vpcNode',
      position: { x: 0, y: vpcYOffset },
      data: { resource: vpc, label: vpc.displayName },
      style: { width: VPC_W, height: vpcH },
    });

    subnets.forEach((subnet, j) => {
      const col = j % 2;
      const row = Math.floor(j / 2);
      nodesMap.set(subnet.id, {
        id: subnet.id,
        type: 'subnetNode',
        position: {
          x: SUBNET_PAD_X + col * SUBNET_COL_GAP,
          y: SUBNET_PAD_Y + row * SUBNET_ROW_GAP,
        },
        data: { resource: subnet, label: subnet.displayName },
        parentNode: vpc.id,
        extent: 'parent',
        style: { width: SUBNET_W, height: SUBNET_H },
      });

      // Resources inside this subnet
      const subnetChildren = resources.filter(
        (r) => parentOf.get(r.id) === subnet.id
      );
      subnetChildren.forEach((child, k) => {
        const col2 = k % 3;
        const row2 = Math.floor(k / 3);
        nodesMap.set(child.id, {
          id: child.id,
          type: nodeTypeFor(child.type),
          position: {
            x: RESOURCE_PAD_X + col2 * RESOURCE_COL_GAP,
            y: RESOURCE_PAD_Y + row2 * RESOURCE_ROW_GAP,
          },
          data: { resource: child, label: child.displayName },
          parentNode: subnet.id,
          extent: 'parent',
          style: { width: RESOURCE_W, height: RESOURCE_H },
        });
      });
    });

    // Place VPC-direct children below subnets
    vpcDirectChildren.forEach((child, k) => {
      // Skip if already placed inside a subnet
      if (nodesMap.has(child.id)) return;
      const col = k % 3;
      const row = Math.floor(k / 3);
      nodesMap.set(child.id, {
        id: child.id,
        type: nodeTypeFor(child.type),
        position: {
          x: SUBNET_PAD_X + col * RESOURCE_COL_GAP,
          y: subnetsBottom + 40 + row * RESOURCE_ROW_GAP,
        },
        data: { resource: child, label: child.displayName },
        parentNode: vpc.id,
        extent: 'parent',
        style: { width: RESOURCE_W, height: RESOURCE_H },
      });
    });

    vpcYOffset += vpcH + VPC_GAP;
  });

  // Root-level nodes (no VPC parent — e.g. S3, Lambda)
  rootResources.forEach((r, i) => {
    nodesMap.set(r.id, {
      id: r.id,
      type: nodeTypeFor(r.type),
      position: { x: ROOT_X, y: i * ROOT_Y_GAP },
      data: { resource: r, label: r.displayName },
      style: { width: RESOURCE_W, height: RESOURCE_H },
    });
  });

  // Remove edges where source or target has no node, and edges that duplicate
  // visual containment (source is already nested inside target via parentNode)
  const nodeIds = new Set(nodesMap.keys());
  const validEdges = edges.filter((e) => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false;
    // Drop containment edges — parentNode nesting already shows the relationship
    const sourceNode = nodesMap.get(e.source)!;
    if (sourceNode.parentNode === e.target) return false;
    return true;
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges: validEdges,
    resources,
    warnings,
  };
}
