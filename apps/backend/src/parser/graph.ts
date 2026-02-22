import type {
  Tfstate,
  CloudResource,
  GraphNode,
  GraphEdge,
  NodeType,
  ParseResponse,
  ProviderConfig,
} from '@infragraph/shared';
import { extractResources } from './tfstate.js';

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

// Calculate subnet dimensions based on child count
function subnetSize(childCount: number): { w: number; h: number } {
  const cols = Math.min(childCount, SUBNET_COLS);
  const rows = Math.max(1, Math.ceil(childCount / SUBNET_COLS));
  const w = SUBNET_PAD_X * 2 + cols * RESOURCE_W + Math.max(0, cols - 1) * RESOURCE_GAP_X;
  const h = SUBNET_PAD_Y + rows * RESOURCE_H + Math.max(0, rows - 1) * RESOURCE_GAP_Y + 20;
  return { w: Math.max(w, 260), h: Math.max(h, 120) };
}

// ─── NodeType lookup from provider config ────────────────────────────────────

function nodeTypeFor(resourceType: string, provider: ProviderConfig): NodeType {
  return provider.nodeTypeMapping[resourceType] ?? 'genericNode';
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Build a graph from pre-extracted resources (works for both tfstate and HCL sources).
 */
export function buildGraphFromResources(
  resources: CloudResource[],
  warnings: string[],
  provider: ProviderConfig,
): ParseResponse {

  // Pass 1: build a Map from cloud IDs (e.g. "vpc-0abc") → Terraform IDs (e.g. "aws_vpc.main")
  const cloudIdToTfId = new Map<string, string>();
  for (const r of resources) {
    const cloudId = r.attributes['id'];
    if (typeof cloudId === 'string' && cloudId) {
      cloudIdToTfId.set(cloudId, r.id);
    }
  }

  // Helper: resolve a cloud ID or Terraform ID to a known Terraform ID
  function resolve(value: string): string | undefined {
    if (cloudIdToTfId.has(value)) return cloudIdToTfId.get(value);
    // Already a Terraform ID (e.g. "aws_vpc.main") — validate it exists
    if (resources.some((r) => r.id === value)) return value;
    return undefined;
  }

  // Pass 2: build edges using provider's edge attributes
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
    for (const [attrKey, edgeLabel] of provider.edgeAttributes) {
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

  // Pass 3: determine parent assignments using provider's container types
  const parentOf = new Map<string, string>();

  // Container type config from provider (outermost first: VPC, then subnet)
  const outerContainer = provider.containerTypes[0]; // e.g. VPC / VNet
  const innerContainer = provider.containerTypes[1]; // e.g. Subnet

  // Index containers for quick lookup
  const outerByCloudId = new Map<string, string>(); // cloud id → tf id
  const innerByCloudId = new Map<string, string>(); // cloud id → tf id

  for (const r of resources) {
    const cloudId = r.attributes['id'];
    if (typeof cloudId !== 'string') continue;
    if (outerContainer && r.type === outerContainer.type) outerByCloudId.set(cloudId, r.id);
    if (innerContainer && r.type === innerContainer.type) innerByCloudId.set(cloudId, r.id);
  }

  for (const r of resources) {
    if (outerContainer && r.type === outerContainer.type) continue; // outer containers are root

    // Prefer inner container placement (e.g. subnet_id → place inside subnet)
    if (innerContainer) {
      const innerRef = r.attributes[innerContainer.parentAttr];
      if (typeof innerRef === 'string' && innerByCloudId.has(innerRef)) {
        parentOf.set(r.id, innerByCloudId.get(innerRef)!);
        continue;
      }

      // subnet_ids[] — use first
      const innerRefs = r.attributes[innerContainer.parentAttr + 's'];
      if (Array.isArray(innerRefs) && innerRefs.length > 0) {
        const first = innerRefs[0];
        if (typeof first === 'string' && innerByCloudId.has(first)) {
          parentOf.set(r.id, innerByCloudId.get(first)!);
          continue;
        }
      }
    }

    // Place inner container inside outer container
    if (innerContainer && outerContainer && r.type === innerContainer.type) {
      const outerRef = r.attributes[outerContainer.parentAttr];
      if (typeof outerRef === 'string' && outerByCloudId.has(outerRef)) {
        parentOf.set(r.id, outerByCloudId.get(outerRef)!);
        continue;
      }
    }

    // Place resources directly attached to outer container
    if (outerContainer) {
      const outerRef = r.attributes[outerContainer.parentAttr];
      if (typeof outerRef === 'string' && outerByCloudId.has(outerRef)) {
        parentOf.set(r.id, outerByCloudId.get(outerRef)!);
      }
    }
  }

  // Pass 4: layout — collect children per parent
  const childrenOf = new Map<string, string[]>();
  const rootResources: CloudResource[] = [];
  const outerContainerType = outerContainer?.type;

  for (const r of resources) {
    const p = parentOf.get(r.id);
    if (p) {
      if (!childrenOf.has(p)) childrenOf.set(p, []);
      childrenOf.get(p)!.push(r.id);
    } else if (r.type !== outerContainerType) {
      rootResources.push(r);
    }
  }

  // Separate outer containers (VPCs / VNets)
  const outerContainers = outerContainerType
    ? resources.filter((r) => r.type === outerContainerType)
    : [];

  // Build nodes
  const nodesMap = new Map<string, GraphNode>();
  const innerContainerType = innerContainer?.type;

  // Outer container nodes — dynamic sizing based on content
  let outerYOffset = 0;
  outerContainers.forEach((outer) => {
    const innerNodes = innerContainerType
      ? resources.filter((r) => r.type === innerContainerType && parentOf.get(r.id) === outer.id)
      : [];

    // Precompute inner container sizes based on their children
    const innerData = innerNodes.map((inner) => {
      const children = resources.filter((r) => parentOf.get(r.id) === inner.id);
      const size = subnetSize(children.length);
      return { subnet: inner, children, ...size };
    });

    // Lay out inner containers in a 2-column grid
    const INNER_MAX_COLS = 2;
    let maxInnerBottom = VPC_PAD_Y;
    const innerPositions: { x: number; y: number; w: number; h: number }[] = [];

    let rowY = VPC_PAD_Y;
    for (let i = 0; i < innerData.length; i += INNER_MAX_COLS) {
      const rowItems = innerData.slice(i, i + INNER_MAX_COLS);
      const rowHeight = Math.max(...rowItems.map((sd) => sd.h));
      let colX = VPC_PAD_X;
      for (const sd of rowItems) {
        innerPositions.push({ x: colX, y: rowY, w: sd.w, h: sd.h });
        colX += sd.w + SUBNET_GAP_X;
      }
      rowY += rowHeight + SUBNET_GAP_Y;
      maxInnerBottom = rowY - SUBNET_GAP_Y;
    }

    // Outer-direct children (IGW, SG, etc.)
    const outerDirectChildren = resources.filter(
      (r) => parentOf.get(r.id) === outer.id && r.type !== innerContainerType
    );
    const directCols = Math.min(outerDirectChildren.length, 3);
    const directRows = Math.ceil(outerDirectChildren.length / 3) || 0;
    const directStartY = maxInnerBottom + SUBNET_GAP_Y;
    const directBottom = directRows > 0
      ? directStartY + directRows * RESOURCE_H + (directRows - 1) * RESOURCE_GAP_Y
      : maxInnerBottom;

    // Outer container dimensions
    let maxRowWidth = 0;
    for (let i = 0; i < innerPositions.length; i += INNER_MAX_COLS) {
      const rowItems = innerPositions.slice(i, i + INNER_MAX_COLS);
      const last = rowItems[rowItems.length - 1]!;
      const rowWidth = last.x + last.w + VPC_PAD_X;
      maxRowWidth = Math.max(maxRowWidth, rowWidth);
    }
    const directWidth = VPC_PAD_X * 2 + directCols * RESOURCE_W + Math.max(0, directCols - 1) * RESOURCE_GAP_X;
    const outerW = Math.max(maxRowWidth, directWidth, 500);
    const outerH = directBottom + VPC_PAD_Y;

    nodesMap.set(outer.id, {
      id: outer.id,
      type: nodeTypeFor(outer.type, provider),
      position: { x: 0, y: outerYOffset },
      data: { resource: outer, label: outer.displayName },
      style: { width: outerW, height: outerH },
    });

    // Place inner containers and their children
    innerData.forEach((sd, j) => {
      const sp = innerPositions[j]!;
      nodesMap.set(sd.subnet.id, {
        id: sd.subnet.id,
        type: nodeTypeFor(sd.subnet.type, provider),
        position: { x: sp.x, y: sp.y },
        data: { resource: sd.subnet, label: sd.subnet.displayName },
        parentNode: outer.id,
        extent: 'parent',
        style: { width: sp.w, height: sp.h },
      });

      sd.children.forEach((child, k) => {
        const col = k % SUBNET_COLS;
        const row = Math.floor(k / SUBNET_COLS);
        nodesMap.set(child.id, {
          id: child.id,
          type: nodeTypeFor(child.type, provider),
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

    // Place outer-direct children below inner containers
    outerDirectChildren.forEach((child, k) => {
      if (nodesMap.has(child.id)) return;
      const col = k % 3;
      const row = Math.floor(k / 3);
      nodesMap.set(child.id, {
        id: child.id,
        type: nodeTypeFor(child.type, provider),
        position: {
          x: VPC_PAD_X + col * (RESOURCE_W + RESOURCE_GAP_X),
          y: directStartY + row * (RESOURCE_H + RESOURCE_GAP_Y),
        },
        data: { resource: child, label: child.displayName },
        parentNode: outer.id,
        extent: 'parent',
        style: { width: RESOURCE_W, height: RESOURCE_H },
      });
    });

    outerYOffset += outerH + VPC_GAP;
  });

  // Root-level nodes (outside outer container) — grouped by type, positioned to the right
  const rootX = Math.max(
    ...Array.from(nodesMap.values()).map((n) => (n.position?.x ?? 0) + ((n.style?.width as number) ?? 0)),
    500
  ) + 60;

  // Group root resources by type for visual clustering
  const rootByType = new Map<string, CloudResource[]>();
  for (const r of rootResources) {
    if (!rootByType.has(r.type)) rootByType.set(r.type, []);
    rootByType.get(r.type)!.push(r);
  }

  let rootY = 0;
  for (const [, group] of rootByType) {
    for (const r of group) {
      nodesMap.set(r.id, {
        id: r.id,
        type: nodeTypeFor(r.type, provider),
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
    provider: provider.id,
    warnings,
  };
}

/**
 * Convenience wrapper: parse a Tfstate and build the graph in one step.
 */
export function buildGraph(tfstate: Tfstate, provider: ProviderConfig): ParseResponse {
  const { resources, warnings } = extractResources(tfstate, provider);
  return buildGraphFromResources(resources, warnings, provider);
}
