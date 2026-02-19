import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function LbNode({ data, selected }: NodeProps<GraphNodeData>) {
  const lbType = data.resource.attributes['load_balancer_type'] as string | undefined;

  return (
    <div className={`node-card border-cyan-500 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">⚖️</span>
        <span className="truncate">{data.label}</span>
      </div>
      {lbType && <span className="text-xs text-slate-400">{lbType}</span>}
      <Handle type="target" position={Position.Left} className="!bg-cyan-400" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-400" />
    </div>
  );
}
