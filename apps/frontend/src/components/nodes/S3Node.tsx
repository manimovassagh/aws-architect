import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function S3Node({ data, selected }: NodeProps<GraphNodeData>) {
  const bucket = data.resource.attributes['bucket'] as string | undefined;

  return (
    <div className={`node-card border-pink-500 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">🪣</span>
        <span className="truncate">{data.label}</span>
      </div>
      {bucket && <span className="text-xs text-slate-400">{bucket}</span>}
      <Handle type="target" position={Position.Left} className="!bg-pink-400" />
      <Handle type="source" position={Position.Right} className="!bg-pink-400" />
    </div>
  );
}
