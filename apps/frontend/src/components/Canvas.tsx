'use client';

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
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

interface CanvasProps {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  onNodeSelect: (nodeId: string | null) => void;
}

export function Canvas({ graphNodes, graphEdges, onNodeSelect }: CanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(graphNodes as Node<GraphNodeData>[]);
  const [edges, , onEdgesChange] = useEdgesState(graphEdges as Edge[]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onNodeSelect(node.id)}
      onPaneClick={() => onNodeSelect(null)}
      fitView
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{ animated: false, style: { stroke: '#475569' } }}
    >
      <Background color="#1e293b" gap={20} size={1} />
      <Controls className="!bg-navy-800 !border-navy-600" />
      <MiniMap
        nodeColor={(node) => {
          switch (node.type) {
            case 'vpcNode':            return '#3b82f6';
            case 'subnetNode':         return '#10b981';
            case 'ec2Node':            return '#f59e0b';
            case 'rdsNode':            return '#a855f7';
            case 's3Node':             return '#ec4899';
            case 'lambdaNode':         return '#f97316';
            case 'lbNode':             return '#06b6d4';
            case 'securityGroupNode':  return '#eab308';
            case 'igwNode':            return '#0ea5e9';
            case 'natNode':            return '#14b8a6';
            case 'eipNode':            return '#f43f5e';
            default:                   return '#64748b';
          }
        }}
        maskColor="rgba(10, 15, 30, 0.7)"
      />
    </ReactFlow>
  );
}
