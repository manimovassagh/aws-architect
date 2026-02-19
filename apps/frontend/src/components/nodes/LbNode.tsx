import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';
import { LbIcon } from './icons/AwsIcons';

export function LbNode({ data, selected }: NodeProps<GraphNodeData>) {
  const lbType = data.resource.attributes['load_balancer_type'] as string | undefined;

  return (
    <div className={`node-card border-l-[#8C4FFF] ${selected ? 'ring-2 ring-[#8C4FFF]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <LbIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#8C4FFF]">Load Balancer</p>
        </div>
      </div>
      {lbType && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{lbType}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#8C4FFF]" />
      <Handle type="source" position={Position.Right} className="!bg-[#8C4FFF]" />
    </div>
  );
}
