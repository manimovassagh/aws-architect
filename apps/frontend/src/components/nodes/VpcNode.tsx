import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';
import { VpcIcon } from './icons/AwsIcons';

export function VpcNode({ data, selected }: NodeProps<GraphNodeData>) {
  const cidr = data.resource.attributes['cidr_block'] as string | undefined;

  return (
    <div className={`h-full w-full rounded-lg border-2 border-dashed border-[#1B660F] bg-[#1B660F]/5 p-3 ${selected ? 'ring-2 ring-[#1B660F]/30' : ''}`}>
      <div className="flex items-center gap-2">
        <VpcIcon className="h-6 w-6 shrink-0" />
        <span className="text-sm font-semibold text-[#1B660F]">{data.label}</span>
        {cidr && <span className="text-xs text-[#1B660F]/70">{cidr}</span>}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-[#1B660F] !opacity-0" />
      <Handle type="source" position={Position.Right} className="!bg-[#1B660F] !opacity-0" />
    </div>
  );
}
