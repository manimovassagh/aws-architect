import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';
import { IgwIcon } from './icons/AwsIcons';

export function IgwNode({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div className={`node-card border-l-[#8C4FFF] ${selected ? 'ring-2 ring-[#8C4FFF]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <IgwIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#8C4FFF]">Internet Gateway</p>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-[#8C4FFF]" />
      <Handle type="source" position={Position.Right} className="!bg-[#8C4FFF]" />
    </div>
  );
}
