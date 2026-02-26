import type { GraphNode, GraphEdge } from '@infragraph/shared';

/**
 * Generates a self-contained HTML string that renders the architecture diagram
 * using React Flow loaded from CDN. Fully interactive (zoom, pan, click).
 */
export function generateStandaloneHtml(
  nodes: GraphNode[],
  edges: GraphEdge[],
  provider: string,
  fileName: string,
  dark: boolean,
): string {
  const nodesJson = JSON.stringify(nodes).replace(/</g, '\\u003c');
  const edgesJson = JSON.stringify(edges).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en" class="${dark ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InfraGraph — ${fileName}</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><` + `/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><` + `/script>
  <script src="https://unpkg.com/reactflow@11/dist/umd/index.js"><` + `/script>
  <link rel="stylesheet" href="https://unpkg.com/reactflow@11/dist/style.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: ${dark ? '#0f172a' : '#f8fafc'}; color: ${dark ? '#e2e8f0' : '#1e293b'}; }
    .react-flow { height: 100vh; }
    .badge { position: fixed; bottom: 16px; left: 16px; display: flex; align-items: center; gap: 10px;
      padding: 8px 14px; border-radius: 10px; font-size: 13px; z-index: 50;
      background: ${dark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)'};
      border: 1px solid ${dark ? '#334155' : '#e2e8f0'}; backdrop-filter: blur(8px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .badge-provider { font-weight: 800; font-size: 15px; color: #FF9900; }
    .badge-info { display: flex; flex-direction: column; gap: 1px; }
    .badge-file { font-weight: 500; font-size: 12px; }
    .badge-count { font-size: 11px; color: ${dark ? '#94a3b8' : '#64748b'}; }
    .watermark { position: fixed; top: 12px; right: 16px; font-size: 11px; color: ${dark ? '#475569' : '#94a3b8'};
      padding: 4px 10px; border-radius: 6px; background: ${dark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.8)'}; z-index: 50; }
    .node-card { display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; border-radius: 6px;
      border: 1px solid ${dark ? '#334155' : '#e2e8f0'}; border-left: 4px solid #94a3b8;
      background: ${dark ? '#1e293b' : '#ffffff'}; font-size: 13px; cursor: pointer; min-width: 120px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .node-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .node-name { font-weight: 600; color: ${dark ? '#e2e8f0' : '#1e293b'}; }
    .node-type { font-size: 11px; color: ${dark ? '#94a3b8' : '#64748b'}; }
    .container-node { border-radius: 8px; padding: 12px; min-height: 100px;
      border: 2px dashed ${dark ? '#334155' : '#cbd5e1'}; }
    .container-label { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
    .react-flow__minimap { border-radius: 8px !important; border: 1px solid ${dark ? '#334155' : '#e2e8f0'} !important; }
    .react-flow__controls { border-radius: 8px !important; border: 1px solid ${dark ? '#334155' : '#e2e8f0'} !important; }
    .react-flow__controls button { background: ${dark ? '#1e293b' : '#fff'} !important; color: ${dark ? '#e2e8f0' : '#1e293b'} !important;
      border-bottom: 1px solid ${dark ? '#334155' : '#e2e8f0'} !important; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    const GRAPH_NODES = ${nodesJson};
    const GRAPH_EDGES = ${edgesJson};
    const PROVIDER = ${JSON.stringify(provider)};
    const FILE_NAME = ${JSON.stringify(fileName)};
    const RESOURCE_COUNT = GRAPH_NODES.filter(n => n.type !== 'vpcNode' && n.type !== 'subnetNode').length;

    const EDGE_COLORS = {
      'secured by': '#DD344C', 'depends on': '#3B48CC', 'routes via': '#8C4FFF',
      'uses eip': '#ED7100', 'attached to': '#64748b', 'behind lb': '#8C4FFF',
      'connects to': '#0ea5e9', 'member of': '#8C4FFF',
    };
    const PROVIDER_COLORS = { aws: '#FF9900', azure: '#0078D4', gcp: '#4285F4' };

    const { createElement: h } = React;
    const { ReactFlow: RF, Background, Controls, MiniMap, Handle, Position } = window.ReactFlow || window.reactflow;

    function GenericNode({ data }) {
      const r = data.resource;
      return h('div', { className: 'node-card', style: { borderLeftColor: PROVIDER_COLORS[PROVIDER] || '#94a3b8' } },
        h(Handle, { type: 'target', position: Position.Left, style: { background: '#94a3b8', width: 6, height: 6 } }),
        h('div', { className: 'node-name' }, r.displayName || r.name),
        h('div', { className: 'node-type' }, r.type.replace(/^aws_|^azurerm_|^google_/g, '').replace(/_/g, ' ')),
        h(Handle, { type: 'source', position: Position.Right, style: { background: '#94a3b8', width: 6, height: 6 } })
      );
    }

    function ContainerNode({ data }) {
      const r = data.resource;
      const isVpc = r.type.includes('vpc') || r.type.includes('vnet') || r.type.includes('network');
      const color = isVpc ? '#16a34a' : '#0ea5e9';
      return h('div', { className: 'container-node', style: { borderColor: color + '60', background: '${dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'}' } },
        h('div', { className: 'container-label', style: { color } }, r.displayName || r.name),
        h(Handle, { type: 'target', position: Position.Left, style: { background: color, width: 6, height: 6 } }),
        h(Handle, { type: 'source', position: Position.Right, style: { background: color, width: 6, height: 6 } })
      );
    }

    const nodeTypes = {};
    const containerTypes = new Set(['vpcNode', 'subnetNode']);
    GRAPH_NODES.forEach(n => {
      if (!nodeTypes[n.type]) {
        nodeTypes[n.type] = containerTypes.has(n.type) ? ContainerNode : GenericNode;
      }
    });

    const rfNodes = GRAPH_NODES.map(n => ({
      ...n,
      style: { ...n.style, opacity: 1 },
    }));

    const rfEdges = GRAPH_EDGES.map(e => {
      const color = EDGE_COLORS[e.label] || '#94a3b8';
      return {
        ...e, type: 'smoothstep', animated: false,
        style: { stroke: color, strokeDasharray: '6 3', strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: '${dark ? '#94a3b8' : '#475569'}' },
        labelBgStyle: { fill: '${dark ? '#1e293b' : '#f8fafc'}', fillOpacity: 0.9 },
        labelBgPadding: [4, 2], labelBgBorderRadius: 3,
      };
    });

    function App() {
      return h('div', { style: { width: '100%', height: '100vh' } },
        h(RF, { nodes: rfNodes, edges: rfEdges, nodeTypes, fitView: true, minZoom: 0.1, maxZoom: 2,
            defaultEdgeOptions: { type: 'smoothstep' } },
          h(Background, { color: '${dark ? '#334155' : '#cbd5e1'}', gap: 20, size: 1 }),
          h(Controls),
          h(MiniMap, { nodeColor: () => PROVIDER_COLORS[PROVIDER] || '#94a3b8',
            maskColor: '${dark ? 'rgba(15,23,42,0.7)' : 'rgba(248,250,252,0.7)'}' })
        ),
        h('div', { className: 'badge' },
          h('span', { className: 'badge-provider' }, PROVIDER.toUpperCase()),
          h('div', { className: 'badge-info' },
            h('span', { className: 'badge-file' }, FILE_NAME),
            h('span', { className: 'badge-count' }, RESOURCE_COUNT + ' resources')
          )
        ),
        h('div', { className: 'watermark' }, 'Generated by InfraGraph')
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(h(App));
  <` + `/script>
</body>
</html>`;
}
