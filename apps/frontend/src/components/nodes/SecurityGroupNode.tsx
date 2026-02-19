import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';
import { SecurityGroupIcon } from './icons/AwsIcons';

export function SecurityGroupNode({ data, selected }: NodeProps<GraphNodeData>) {
  const name = data.resource.attributes['name'] as string | undefined;

  return (
    <div className={`node-card border-l-[#DD344C] ${selected ? 'ring-2 ring-[#DD344C]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <SecurityGroupIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#DD344C]">Security Group</p>
        </div>
      </div>
      {name && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{name}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#DD344C]" />
      <Handle type="source" position={Position.Right} className="!bg-[#DD344C]" />
    </div>
  );
}
