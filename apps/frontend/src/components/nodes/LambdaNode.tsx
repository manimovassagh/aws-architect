import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function LambdaNode({ data, selected }: NodeProps<GraphNodeData>) {
  const runtime = data.resource.attributes['runtime'] as string | undefined;

  return (
    <div className={`node-card border-orange-500 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">⚡</span>
        <span className="truncate">{data.label}</span>
      </div>
      {runtime && <span className="text-xs text-slate-400">{runtime}</span>}
      <Handle type="target" position={Position.Left} className="!bg-orange-400" />
      <Handle type="source" position={Position.Right} className="!bg-orange-400" />
    </div>
  );
}
