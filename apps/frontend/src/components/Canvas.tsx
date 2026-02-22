import { useRef, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { GraphNode, GraphEdge, GraphNodeData } from '@awsarchitect/shared';

import { VpcNode } from './nodes/VpcNode';
import { SubnetNode } from './nodes/SubnetNode';
import { Ec2Node } from './nodes/Ec2Node';
import { RdsNode } from './nodes/RdsNode';
import { S3Node } from './nodes/S3Node';
import { LambdaNode } from './nodes/LambdaNode';
import { LbNode } from './nodes/LbNode';
import { IgwNode } from './nodes/IgwNode';
import { NatNode } from './nodes/NatNode';
import { RouteTableNode } from './nodes/RouteTableNode';
import { SecurityGroupNode } from './nodes/SecurityGroupNode';
import { EipNode } from './nodes/EipNode';
import { GenericNode } from './nodes/GenericNode';

// MUST be defined at module scope — inside component causes infinite re-renders
const nodeTypes = {
  vpcNode: VpcNode,
  subnetNode: SubnetNode,
  ec2Node: Ec2Node,
  rdsNode: RdsNode,
  s3Node: S3Node,
  lambdaNode: LambdaNode,
  lbNode: LbNode,
  igwNode: IgwNode,
  natNode: NatNode,
  routeTableNode: RouteTableNode,
  securityGroupNode: SecurityGroupNode,
  eipNode: EipNode,
  genericNode: GenericNode,
};

const defaultEdgeOptions = {
  animated: false,
  type: 'smoothstep' as const,
  style: { stroke: '#94a3b8', strokeDasharray: '6 3', strokeWidth: 1.5 },
};

function minimapNodeColor(node: Node) {
  switch (node.type) {
    case 'vpcNode':            return '#1B660F';
    case 'subnetNode':         return '#147EBA';
    case 'ec2Node':            return '#ED7100';
    case 'rdsNode':            return '#3B48CC';
    case 's3Node':             return '#3F8624';
    case 'lambdaNode':         return '#ED7100';
    case 'lbNode':             return '#8C4FFF';
    case 'securityGroupNode':  return '#DD344C';
    case 'igwNode':            return '#8C4FFF';
    case 'natNode':            return '#8C4FFF';
    case 'eipNode':            return '#ED7100';
    case 'routeTableNode':     return '#8C4FFF';
    default:                   return '#7B8794';
  }
}

// Edge colors by relationship type
const EDGE_COLORS: Record<string, string> = {
  'secured by': '#DD344C',
  'depends on': '#3B48CC',
  'routes via': '#8C4FFF',
  'uses eip':   '#ED7100',
  'attached to': '#64748b',
  'behind lb':  '#8C4FFF',
};

interface CanvasProps {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  selectedNodeId: string | null;
  searchQuery: string;
  hiddenTypes?: Set<string>;
  onNodeSelect: (nodeId: string | null) => void;
}

function nodeMatchesSearch(node: GraphNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const r = node.data.resource;
  return (
    r.displayName.toLowerCase().includes(q) ||
    r.type.toLowerCase().includes(q) ||
    r.id.toLowerCase().includes(q) ||
    r.name.toLowerCase().includes(q) ||
    Object.values(r.tags).some((v) => v.toLowerCase().includes(q)) ||
    Object.values(r.attributes).some((v) => typeof v === 'string' && v.toLowerCase().includes(q))
  );
}

export interface CanvasHandle {
  exportPng: () => Promise<void>;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas({ graphNodes, graphEdges, selectedNodeId, searchQuery, hiddenTypes, onNodeSelect }, ref) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const exportPng = useCallback(async () => {
    const el = wrapperRef.current;
    if (!el) return;
    const dataUrl = await toPng(el, { backgroundColor: '#f8fafc' });
    const link = document.createElement('a');
    link.download = 'architecture.png';
    link.href = dataUrl;
    link.click();
  }, []);

  useImperativeHandle(ref, () => ({ exportPng }));
  // Filter out hidden resource types, cascading to children of hidden parents
  const visibleNodes = useMemo(() => {
    if (!hiddenTypes || hiddenTypes.size === 0) return graphNodes;

    // Pass 1: Remove nodes whose type is hidden or whose parent is hidden
    const hiddenNodeIds = new Set(
      graphNodes.filter((n) => hiddenTypes.has(n.data.resource.type)).map((n) => n.id)
    );
    let filtered = graphNodes.filter(
      (n) => !hiddenTypes.has(n.data.resource.type) && (!n.parentNode || !hiddenNodeIds.has(n.parentNode))
    );

    // Pass 2: Remove container nodes with no visible children
    const CONTAINER_TYPES = new Set(['vpcNode', 'subnetNode']);
    let changed = true;
    while (changed) {
      changed = false;
      const currentIds = new Set(filtered.map((n) => n.id));
      const hasChildren = new Set<string>();
      for (const n of filtered) {
        if (n.parentNode && currentIds.has(n.parentNode)) {
          hasChildren.add(n.parentNode);
        }
      }
      const next = filtered.filter(
        (n) => !CONTAINER_TYPES.has(n.type) || hasChildren.has(n.id)
      );
      if (next.length < filtered.length) {
        changed = true;
        filtered = next;
      }
    }

    return filtered;
  }, [graphNodes, hiddenTypes]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    if (!hiddenTypes || hiddenTypes.size === 0) return graphEdges;
    return graphEdges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [graphEdges, hiddenTypes, visibleNodeIds]);

  // Apply search dimming to nodes
  const matchingNodeIds = useMemo(() => {
    if (!searchQuery) return null;
    return new Set(visibleNodes.filter((n) => nodeMatchesSearch(n, searchQuery)).map((n) => n.id));
  }, [visibleNodes, searchQuery]);

  const nodes = useMemo(() => {
    return visibleNodes.map((n) => {
      const isDimmed = matchingNodeIds !== null && !matchingNodeIds.has(n.id);
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isDimmed ? 0.25 : 1,
        },
      } as Node<GraphNodeData>;
    });
  }, [visibleNodes, matchingNodeIds]);

  // Style edges with color-coding and selection highlighting
  const edges = useMemo(
    () =>
      visibleEdges.map((e) => {
        const isConnected = selectedNodeId
          ? e.source === selectedNodeId || e.target === selectedNodeId
          : false;
        const isDimmed = selectedNodeId !== null && !isConnected;
        const edgeColor = EDGE_COLORS[e.label ?? ''] ?? '#94a3b8';
        const color = isDimmed ? '#e2e8f0' : edgeColor;

        return {
          ...e,
          type: 'smoothstep',
          animated: isConnected,
          style: {
            stroke: color,
            strokeDasharray: isConnected ? undefined : '6 3',
            strokeWidth: isConnected ? 2.5 : 1.5,
          },
          labelStyle: {
            fontSize: 10,
            fill: isDimmed ? '#cbd5e1' : '#475569',
            fontWeight: isConnected ? 600 : 400,
          },
          labelBgStyle: {
            fill: isConnected ? '#ffffff' : '#f8fafc',
            fillOpacity: isConnected ? 1 : 0.9,
          },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 3,
        };
      }),
    [visibleEdges, selectedNodeId]
  ) as Edge[];

  return (
    <div ref={wrapperRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_: React.MouseEvent, node: Node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect(null)}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(248, 250, 252, 0.7)"
        />
      </ReactFlow>
    </div>
  );
});
