import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function SecurityGroupNode({ data, selected }: NodeProps<GraphNodeData>) {
  const name = data.resource.attributes['name'] as string | undefined;

  return (
    <div className={`node-card border-yellow-500 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">🛡️</span>
        <span className="truncate">{data.label}</span>
      </div>
      {name && <span className="text-xs text-slate-400">{name}</span>}
      <Handle type="target" position={Position.Left} className="!bg-yellow-400" />
      <Handle type="source" position={Position.Right} className="!bg-yellow-400" />
    </div>
  );
}
