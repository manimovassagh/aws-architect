import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function EipNode({ data, selected }: NodeProps<GraphNodeData>) {
  const publicIp = data.resource.attributes['public_ip'] as string | undefined;

  return (
    <div className={`node-card border-rose-500 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">📍</span>
        <span className="truncate">{data.label}</span>
      </div>
      {publicIp && <span className="text-xs text-slate-400">{publicIp}</span>}
      <Handle type="target" position={Position.Left} className="!bg-rose-400" />
      <Handle type="source" position={Position.Right} className="!bg-rose-400" />
    </div>
  );
}
