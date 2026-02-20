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

const VPC_PAD_X = 30;
const VPC_PAD_Y = 50;
const VPC_GAP = 60;
const SUBNET_GAP_X = 40;       // horizontal gap between subnets
const SUBNET_GAP_Y = 40;       // vertical gap between subnet rows

const SUBNET_PAD_X = 20;       // padding inside subnet
const SUBNET_PAD_Y = 50;       // top padding (room for subnet header)
const SUBNET_COLS = 2;          // max resources per row inside subnet

const RESOURCE_W = 210;
const RESOURCE_H = 100;
const RESOURCE_GAP_X = 20;     // gap between resource columns
const RESOURCE_GAP_Y = 20;     // gap between resource rows

const ROOT_GAP = 130;

// Calculate subnet dimensions based on child count
function subnetSize(childCount: number): { w: number; h: number } {
  const cols = Math.min(childCount, SUBNET_COLS);
  const rows = Math.max(1, Math.ceil(childCount / SUBNET_COLS));
  const w = SUBNET_PAD_X * 2 + cols * RESOURCE_W + Math.max(0, cols - 1) * RESOURCE_GAP_X;
  const h = SUBNET_PAD_Y + rows * RESOURCE_H + Math.max(0, rows - 1) * RESOURCE_GAP_Y + 20;
  return { w: Math.max(w, 260), h: Math.max(h, 120) };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Build a graph from pre-extracted resources (works for both tfstate and HCL sources).
 */
export function buildGraphFromResources(
  resources: AwsResource[],
  warnings: string[],
): ParseResponse {

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

  // VPC nodes — dynamic sizing based on content
  let vpcYOffset = 0;
  vpcs.forEach((vpc) => {
    const subnets = resources.filter(
      (r) => r.type === 'aws_subnet' && parentOf.get(r.id) === vpc.id
    );

    // Precompute subnet sizes based on their children
    const subnetData = subnets.map((subnet) => {
      const children = resources.filter((r) => parentOf.get(r.id) === subnet.id);
      const size = subnetSize(children.length);
      return { subnet, children, ...size };
    });

    // Lay out subnets in a 2-column grid (wraps to multiple rows)
    const SUBNET_MAX_COLS = 2;
    let maxSubnetBottom = VPC_PAD_Y;
    const subnetPositions: { x: number; y: number; w: number; h: number }[] = [];

    // Group subnets into rows of SUBNET_MAX_COLS
    let rowY = VPC_PAD_Y;
    for (let i = 0; i < subnetData.length; i += SUBNET_MAX_COLS) {
      const rowItems = subnetData.slice(i, i + SUBNET_MAX_COLS);
      const rowHeight = Math.max(...rowItems.map((sd) => sd.h));
      let colX = VPC_PAD_X;
      for (const sd of rowItems) {
        subnetPositions.push({ x: colX, y: rowY, w: sd.w, h: sd.h });
        colX += sd.w + SUBNET_GAP_X;
      }
      rowY += rowHeight + SUBNET_GAP_Y;
      maxSubnetBottom = rowY - SUBNET_GAP_Y;
    }

    // VPC-direct children (IGW, SG, etc.)
    const vpcDirectChildren = resources.filter(
      (r) => parentOf.get(r.id) === vpc.id && r.type !== 'aws_subnet'
    );
    const directCols = Math.min(vpcDirectChildren.length, 3);
    const directRows = Math.ceil(vpcDirectChildren.length / 3) || 0;
    const directStartY = maxSubnetBottom + SUBNET_GAP_Y;
    const directBottom = directRows > 0
      ? directStartY + directRows * RESOURCE_H + (directRows - 1) * RESOURCE_GAP_Y
      : maxSubnetBottom;

    // VPC dimensions — widest subnet row determines width
    let maxRowWidth = 0;
    for (let i = 0; i < subnetPositions.length; i += SUBNET_MAX_COLS) {
      const rowItems = subnetPositions.slice(i, i + SUBNET_MAX_COLS);
      const last = rowItems[rowItems.length - 1]!;
      const rowWidth = last.x + last.w + VPC_PAD_X;
      maxRowWidth = Math.max(maxRowWidth, rowWidth);
    }
    const directWidth = VPC_PAD_X * 2 + directCols * RESOURCE_W + Math.max(0, directCols - 1) * RESOURCE_GAP_X;
    const vpcW = Math.max(maxRowWidth, directWidth, 500);
    const vpcH = directBottom + VPC_PAD_Y;

    nodesMap.set(vpc.id, {
      id: vpc.id,
      type: 'vpcNode',
      position: { x: 0, y: vpcYOffset },
      data: { resource: vpc, label: vpc.displayName },
      style: { width: vpcW, height: vpcH },
    });

    // Place subnets and their children
    subnetData.forEach((sd, j) => {
      const sp = subnetPositions[j]!;
      nodesMap.set(sd.subnet.id, {
        id: sd.subnet.id,
        type: 'subnetNode',
        position: { x: sp.x, y: sp.y },
        data: { resource: sd.subnet, label: sd.subnet.displayName },
        parentNode: vpc.id,
        extent: 'parent',
        style: { width: sp.w, height: sp.h },
      });

      sd.children.forEach((child, k) => {
        const col = k % SUBNET_COLS;
        const row = Math.floor(k / SUBNET_COLS);
        nodesMap.set(child.id, {
          id: child.id,
          type: nodeTypeFor(child.type),
          position: {
            x: SUBNET_PAD_X + col * (RESOURCE_W + RESOURCE_GAP_X),
            y: SUBNET_PAD_Y + row * (RESOURCE_H + RESOURCE_GAP_Y),
          },
          data: { resource: child, label: child.displayName },
          parentNode: sd.subnet.id,
          extent: 'parent',
          style: { width: RESOURCE_W, height: RESOURCE_H },
        });
      });
    });

    // Place VPC-direct children below subnets
    vpcDirectChildren.forEach((child, k) => {
      if (nodesMap.has(child.id)) return;
      const col = k % 3;
      const row = Math.floor(k / 3);
      nodesMap.set(child.id, {
        id: child.id,
        type: nodeTypeFor(child.type),
        position: {
          x: VPC_PAD_X + col * (RESOURCE_W + RESOURCE_GAP_X),
          y: directStartY + row * (RESOURCE_H + RESOURCE_GAP_Y),
        },
        data: { resource: child, label: child.displayName },
        parentNode: vpc.id,
        extent: 'parent',
        style: { width: RESOURCE_W, height: RESOURCE_H },
      });
    });

    vpcYOffset += vpcH + VPC_GAP;
  });

  // Root-level nodes (outside VPC) — grouped by type, positioned to the right
  const rootX = Math.max(
    ...Array.from(nodesMap.values()).map((n) => (n.position?.x ?? 0) + ((n.style?.width as number) ?? 0)),
    500
  ) + 60;

  // Group root resources by type for visual clustering
  const rootByType = new Map<string, AwsResource[]>();
  for (const r of rootResources) {
    if (!rootByType.has(r.type)) rootByType.set(r.type, []);
    rootByType.get(r.type)!.push(r);
  }

  let rootY = 0;
  for (const [, group] of rootByType) {
    for (const r of group) {
      nodesMap.set(r.id, {
        id: r.id,
        type: nodeTypeFor(r.type),
        position: { x: rootX, y: rootY },
        data: { resource: r, label: r.displayName },
        style: { width: RESOURCE_W, height: RESOURCE_H },
      });
      rootY += RESOURCE_H + RESOURCE_GAP_Y;
    }
    rootY += 20; // extra gap between type groups
  }

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

/**
 * Convenience wrapper: parse a Tfstate and build the graph in one step.
 */
export function buildGraph(tfstate: Tfstate): ParseResponse {
  const { resources, warnings } = extractResources(tfstate);
  return buildGraphFromResources(resources, warnings);
}
