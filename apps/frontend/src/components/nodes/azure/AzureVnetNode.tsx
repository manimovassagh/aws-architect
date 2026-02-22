import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { AzureVnetIcon } from '../icons/AzureIcons';

export function AzureVnetNode({ data, selected }: NodeProps<GraphNodeData>) {
  const addressSpace = data.resource.attributes['address_space'] as string[] | string | undefined;
  const display = Array.isArray(addressSpace) ? addressSpace[0] : addressSpace;

  return (
    <div className={`h-full w-full rounded-lg border-2 border-dashed border-[#107C10] bg-[#107C10]/5 p-3 ${selected ? 'ring-2 ring-[#107C10]/30' : ''}`}>
      <div className="flex items-center gap-2">
        <AzureVnetIcon className="h-6 w-6 shrink-0" />
        <span className="text-sm font-semibold text-[#107C10]">{data.label}</span>
        {display && <span className="text-xs text-[#107C10]/70">{display}</span>}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-[#107C10] !opacity-0" />
      <Handle type="source" position={Position.Right} className="!bg-[#107C10] !opacity-0" />
    </div>
  );
}
