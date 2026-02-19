import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function RdsNode({ data, selected }: NodeProps<GraphNodeData>) {
  const engine = data.resource.attributes['engine'] as string | undefined;

  return (
    <div className={`node-card border-purple-500 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">🗄️</span>
        <span className="truncate">{data.label}</span>
      </div>
      {engine && <span className="text-xs text-slate-400">{engine}</span>}
      <Handle type="target" position={Position.Left} className="!bg-purple-400" />
      <Handle type="source" position={Position.Right} className="!bg-purple-400" />
    </div>
  );
}
