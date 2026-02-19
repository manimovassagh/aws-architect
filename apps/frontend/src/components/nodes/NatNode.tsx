import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function NatNode({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div className={`node-card border-teal-500 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">🔀</span>
        <span className="truncate">{data.label}</span>
      </div>
      <span className="text-xs text-slate-400">NAT Gateway</span>
      <Handle type="target" position={Position.Left} className="!bg-teal-400" />
      <Handle type="source" position={Position.Right} className="!bg-teal-400" />
    </div>
  );
}
