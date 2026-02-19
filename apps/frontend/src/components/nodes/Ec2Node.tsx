import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function Ec2Node({ data, selected }: NodeProps<GraphNodeData>) {
  const instanceType = data.resource.attributes['instance_type'] as string | undefined;

  return (
    <div className={`node-card border-amber-500 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">🖥️</span>
        <span className="truncate">{data.label}</span>
      </div>
      {instanceType && <span className="text-xs text-slate-400">{instanceType}</span>}
      <Handle type="target" position={Position.Left} className="!bg-amber-400" />
      <Handle type="source" position={Position.Right} className="!bg-amber-400" />
    </div>
  );
}
