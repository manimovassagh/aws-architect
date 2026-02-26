import { useRef, useMemo, useImperativeHandle, forwardRef, useCallback, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { GraphNode, GraphEdge, GraphNodeData, PlanAction } from '@infragraph/shared';
import type { ProviderFrontendConfig } from '@/providers/types';
import { generateStandaloneHtml } from '@/lib/exportHtml';

const PLAN_ACTION_COLORS: Record<PlanAction, string | undefined> = {
  create: '#22c55e',   // green-500
  update: '#3b82f6',   // blue-500
  delete: '#ef4444',   // red-500
  replace: '#f59e0b',  // amber-500
  'no-op': undefined,
  read: '#8b5cf6',     // violet-500
};

const defaultEdgeOptions = {
  animated: false,
  type: 'smoothstep' as const,
  style: { stroke: '#94a3b8', strokeDasharray: '6 3', strokeWidth: 1.5 },
};

interface CanvasProps {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  selectedNodeId: string | null;
  searchQuery: string;
  hiddenTypes?: Set<string>;
  providerConfig: ProviderFrontendConfig;
  provider?: string;
  fileName?: string;
  blastRadiusMode?: boolean;
  costMap?: Map<string, string>;
  onNodeSelect: (nodeId: string | null) => void;
  onBlastRadiusComputed?: (count: number) => void;
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
  exportHtml: () => void;
}

/**
 * BFS traversal to find all nodes transitively connected to a root node.
 * Returns a Map of nodeId → depth (hop count from root).
 */
function computeBlastRadius(
  rootId: string,
  edges: GraphEdge[],
  nodes: GraphNode[],
): Map<string, number> {
  // Build adjacency list (bidirectional: "what depends on me" + "what I depend on")
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }

  const depths = new Map<string, number>();
  depths.set(rootId, 0);
  const queue = [rootId];
  const nodeIds = new Set(nodes.map((n) => n.id));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current)!;
    for (const neighbor of adj.get(current) ?? []) {
      if (!depths.has(neighbor) && nodeIds.has(neighbor)) {
        depths.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  return depths;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { graphNodes, graphEdges, selectedNodeId, searchQuery, hiddenTypes, providerConfig, provider, fileName, blastRadiusMode, costMap, onNodeSelect, onBlastRadiusComputed },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const exportPng = useCallback(async () => {
    const el = wrapperRef.current;
    if (!el) return;
    const dataUrl = await toPng(el, { backgroundColor: '#f8fafc' });
    const link = document.createElement('a');
    link.download = 'architecture.png';
    link.href = dataUrl;
    link.click();
  }, []);

  const exportHtml = useCallback(() => {
    const dark = document.documentElement.classList.contains('dark');
    const html = generateStandaloneHtml(
      graphNodes, graphEdges, provider ?? 'aws', fileName ?? 'architecture', dark,
    );
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${(fileName ?? 'architecture').replace(/\.[^.]+$/, '')}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [graphNodes, graphEdges, provider, fileName]);

  useImperativeHandle(ref, () => ({ exportPng, exportHtml }));

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

  // Compute which nodes are connected to the hovered node (direct neighbors)
  const hoverConnected = useMemo(() => {
    if (!hoveredNodeId) return null;
    const nodeIds = new Set<string>([hoveredNodeId]);
    const edgeIds = new Set<string>();
    for (const e of visibleEdges) {
      if (e.source === hoveredNodeId || e.target === hoveredNodeId) {
        edgeIds.add(e.id);
        nodeIds.add(e.source);
        nodeIds.add(e.target);
      }
    }
    // Also keep parent containers (VPC/Subnet) of connected nodes visible
    for (const n of visibleNodes) {
      if (nodeIds.has(n.id) && n.parentNode) {
        nodeIds.add(n.parentNode);
        // grandparent (subnet → vpc)
        const parent = visibleNodes.find((p) => p.id === n.parentNode);
        if (parent?.parentNode) nodeIds.add(parent.parentNode);
      }
    }
    return { nodeIds, edgeIds };
  }, [hoveredNodeId, visibleEdges, visibleNodes]);

  // Compute blast radius when mode is active + a node is selected
  const blastRadius = useMemo(() => {
    if (!blastRadiusMode || !selectedNodeId) return null;
    const depths = computeBlastRadius(selectedNodeId, visibleEdges, visibleNodes);
    // Include parent containers for visible context
    for (const n of visibleNodes) {
      if (depths.has(n.id) && n.parentNode) {
        if (!depths.has(n.parentNode)) depths.set(n.parentNode, 999);
        const parent = visibleNodes.find((p) => p.id === n.parentNode);
        if (parent?.parentNode && !depths.has(parent.parentNode)) {
          depths.set(parent.parentNode, 999);
        }
      }
    }
    return depths;
  }, [blastRadiusMode, selectedNodeId, visibleEdges, visibleNodes]);

  // Notify parent of blast radius count (excluding containers at depth 999 and root)
  const blastRadiusCount = useMemo(() => {
    if (!blastRadius) return 0;
    let count = 0;
    for (const [, depth] of blastRadius) {
      if (depth > 0 && depth < 999) count++;
    }
    return count;
  }, [blastRadius]);

  // Report count back to parent
  useEffect(() => {
    if (blastRadiusMode) onBlastRadiusComputed?.(blastRadiusCount);
  }, [blastRadiusMode, blastRadiusCount, onBlastRadiusComputed]);

  // Blast radius CSS dimming — depth-based color tiers
  const blastRadiusStyle = useMemo(() => {
    if (!blastRadius) return null;
    const dimmedNodeSelectors: string[] = [];
    const dimmedEdgeSelectors: string[] = [];
    const depth1Selectors: string[] = [];
    const depth2Selectors: string[] = [];
    const depth3PlusSelectors: string[] = [];

    for (const n of visibleNodes) {
      const depth = blastRadius.get(n.id);
      if (depth === undefined) {
        dimmedNodeSelectors.push(`.react-flow__node[data-id="${CSS.escape(n.id)}"]`);
      } else if (depth === 1) {
        depth1Selectors.push(`.react-flow__node[data-id="${CSS.escape(n.id)}"]`);
      } else if (depth === 2) {
        depth2Selectors.push(`.react-flow__node[data-id="${CSS.escape(n.id)}"]`);
      } else if (depth > 2 && depth < 999) {
        depth3PlusSelectors.push(`.react-flow__node[data-id="${CSS.escape(n.id)}"]`);
      }
    }

    // Dim edges not between blast radius nodes
    for (const e of visibleEdges) {
      const srcIn = blastRadius.has(e.source);
      const tgtIn = blastRadius.has(e.target);
      if (!srcIn || !tgtIn) {
        dimmedEdgeSelectors.push(`.react-flow__edge[data-testid="rf__edge-${CSS.escape(e.id)}"]`);
      }
    }

    const rules: string[] = [];
    if (dimmedNodeSelectors.length > 0) {
      rules.push(`${dimmedNodeSelectors.join(',')}{opacity:0.1!important;transition:opacity 0.3s ease}`);
    }
    if (dimmedEdgeSelectors.length > 0) {
      rules.push(`${dimmedEdgeSelectors.join(',')}{opacity:0.08!important;transition:opacity 0.3s ease}`);
    }
    // Depth tiers — closer = more vivid red glow
    if (depth1Selectors.length > 0) {
      rules.push(`${depth1Selectors.join(',')}{outline:3px solid #ef4444!important;outline-offset:2px;border-radius:8px;transition:outline 0.3s ease}`);
    }
    if (depth2Selectors.length > 0) {
      rules.push(`${depth2Selectors.join(',')}{outline:2px solid #f97316!important;outline-offset:2px;border-radius:8px;transition:outline 0.3s ease}`);
    }
    if (depth3PlusSelectors.length > 0) {
      rules.push(`${depth3PlusSelectors.join(',')}{outline:2px solid #fbbf24!important;outline-offset:2px;border-radius:8px;transition:outline 0.3s ease}`);
    }
    return rules.length > 0 ? rules.join('\n') : null;
  }, [blastRadius, visibleNodes, visibleEdges]);

  // Stable node objects — only change on search/filter/plan, NOT on hover
  const nodes = useMemo(() => {
    return visibleNodes.map((n) => {
      const searchDimmed = matchingNodeIds !== null && !matchingNodeIds.has(n.id);
      const planAction = n.data.planAction;
      const planColor = planAction ? PLAN_ACTION_COLORS[planAction] : undefined;
      return {
        ...n,
        style: {
          ...n.style,
          opacity: searchDimmed ? 0.2 : 1,
          transition: 'opacity 0.2s ease, outline-color 0.2s ease',
          ...(planColor ? { outline: `3px solid ${planColor}`, outlineOffset: '2px', borderRadius: 8 } : {}),
        },
      } as Node<GraphNodeData>;
    });
  }, [visibleNodes, matchingNodeIds]);

  // Hover dimming via CSS — avoids recreating node objects on every mouse move
  const hoverDimStyle = useMemo(() => {
    if (!hoverConnected) return null;
    const dimmedNodeSelectors = visibleNodes
      .filter((n) => !hoverConnected.nodeIds.has(n.id))
      .map((n) => `.react-flow__node[data-id="${CSS.escape(n.id)}"]`);
    const dimmedEdgeSelectors = visibleEdges
      .filter((e) => !hoverConnected.edgeIds.has(e.id))
      .map((e) => `.react-flow__edge[data-testid="rf__edge-${CSS.escape(e.id)}"]`);
    const rules: string[] = [];
    if (dimmedNodeSelectors.length > 0) {
      rules.push(`${dimmedNodeSelectors.join(',')}{opacity:0.55!important;transition:opacity 0.2s ease}`);
    }
    if (dimmedEdgeSelectors.length > 0) {
      rules.push(`${dimmedEdgeSelectors.join(',')}{opacity:0.35!important;transition:opacity 0.2s ease}`);
    }
    return rules.length > 0 ? rules.join('\n') : null;
  }, [hoverConnected, visibleNodes, visibleEdges]);

  // Cost badge overlay via CSS ::after pseudo-elements
  const costStyle = useMemo(() => {
    if (!costMap || costMap.size === 0) return null;
    const rules: string[] = [];
    for (const n of visibleNodes) {
      const costLabel = costMap.get(n.id);
      if (costLabel) {
        const sel = `.react-flow__node[data-id="${CSS.escape(n.id)}"]`;
        rules.push(
          `${sel}{position:relative}` +
          `${sel}::after{` +
          `content:"${costLabel}";` +
          `position:absolute;bottom:-6px;right:-6px;` +
          `font-size:9px;font-weight:700;line-height:1;` +
          `background:#059669;color:#fff;` +
          `padding:2px 5px;border-radius:8px;` +
          `pointer-events:none;z-index:10;` +
          `box-shadow:0 1px 3px rgba(0,0,0,0.2);` +
          `white-space:nowrap}`,
        );
      }
    }
    return rules.length > 0 ? rules.join('\n') : null;
  }, [costMap, visibleNodes]);

  // Style edges — only recompute on selection, not hover (hover handled by CSS)
  const edges = useMemo(
    () =>
      visibleEdges.map((e) => {
        const isSelected = selectedNodeId
          ? e.source === selectedNodeId || e.target === selectedNodeId
          : false;
        const isDimmed = selectedNodeId !== null && !isSelected;
        const edgeColor = providerConfig.edgeColors[e.label ?? ''] ?? '#94a3b8';
        const color = isDimmed ? '#e2e8f0' : edgeColor;

        return {
          ...e,
          type: 'smoothstep',
          animated: isSelected,
          style: {
            stroke: color,
            strokeDasharray: isSelected ? undefined : '6 3',
            strokeWidth: isSelected ? 2.5 : 1.5,
            transition: 'stroke 0.2s ease, stroke-width 0.2s ease, opacity 0.2s ease',
            opacity: isDimmed ? 0.15 : 1,
          },
          labelStyle: {
            fontSize: 10,
            fill: isDimmed ? '#cbd5e1' : '#475569',
            fontWeight: isSelected ? 600 : 400,
          },
          labelBgStyle: {
            fill: isSelected ? '#ffffff' : '#f8fafc',
            fillOpacity: isSelected ? 1 : 0.9,
          },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 3,
        };
      }),
    [visibleEdges, selectedNodeId, providerConfig.edgeColors]
  ) as Edge[];

  // Determine if plan actions exist for showing the legend
  const planActionCounts = useMemo(() => {
    const counts = new Map<PlanAction, number>();
    for (const n of graphNodes) {
      const action = n.data.planAction;
      if (action) counts.set(action, (counts.get(action) ?? 0) + 1);
    }
    return counts;
  }, [graphNodes]);

  const showPlanLegend = planActionCounts.size > 0;

  return (
    <div ref={wrapperRef} className="w-full h-full">
      {hoverDimStyle && !blastRadius && <style>{hoverDimStyle}</style>}
      {blastRadiusStyle && <style>{blastRadiusStyle}</style>}
      {costStyle && <style>{costStyle}</style>}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={providerConfig.nodeTypes}
        onNodeClick={(_: React.MouseEvent, node: Node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect(null)}
        onNodeMouseEnter={(_: React.MouseEvent, node: Node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={providerConfig.minimapNodeColor}
          nodeStrokeColor={providerConfig.minimapNodeColor}
          nodeStrokeWidth={2}
          nodeBorderRadius={3}
          maskColor={document.documentElement.classList.contains('dark')
            ? 'rgba(15, 23, 42, 0.75)'
            : 'rgba(248, 250, 252, 0.7)'}
          pannable
          zoomable
          className="!bg-white/80 dark:!bg-slate-900/80 !border !border-slate-200 dark:!border-slate-700 !rounded-lg !shadow-lg"
        />
      </ReactFlow>
      {showPlanLegend && (
        <div className="absolute bottom-4 right-4 z-10 rounded-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-2.5 shadow-lg">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Plan Changes</p>
          <div className="flex flex-col gap-1">
            {((['create', 'update', 'delete', 'replace', 'no-op', 'read'] as PlanAction[])
              .filter((a) => planActionCounts.has(a))
              .map((action) => {
                const color = PLAN_ACTION_COLORS[action];
                const count = planActionCounts.get(action)!;
                const labels: Record<PlanAction, string> = {
                  create: 'Create',
                  update: 'Update',
                  delete: 'Destroy',
                  replace: 'Replace',
                  'no-op': 'Unchanged',
                  read: 'Read',
                };
                return (
                  <div key={action} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span
                      className="inline-block w-3 h-3 rounded-sm border"
                      style={{
                        backgroundColor: color ? `${color}20` : '#f1f5f9',
                        borderColor: color ?? '#cbd5e1',
                        borderWidth: 2,
                      }}
                    />
                    <span>{labels[action]}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-auto tabular-nums">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});
