import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { AzureSubnetIcon } from '../icons/AzureIcons';

export function AzureSubnetNode({ data, selected }: NodeProps<GraphNodeData>) {
  const addressPrefix = data.resource.attributes['address_prefix'] as string | undefined;

  return (
    <div className={`h-full w-full rounded-lg border-2 border-dashed border-[#0078D4] bg-[#0078D4]/5 p-3 ${selected ? 'ring-2 ring-[#0078D4]/30' : ''}`}>
      <div className="flex items-center gap-2">
        <AzureSubnetIcon className="h-6 w-6 shrink-0" />
        <span className="text-sm font-semibold text-[#0078D4]">{data.label}</span>
        {addressPrefix && <span className="text-xs text-[#0078D4]/70">{addressPrefix}</span>}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-[#0078D4] !opacity-0" />
      <Handle type="source" position={Position.Right} className="!bg-[#0078D4] !opacity-0" />
    </div>
  );
}
