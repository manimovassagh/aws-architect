import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { AzureLbIcon } from '../icons/AzureIcons';

export function AzureLbNode({ data, selected }: NodeProps<GraphNodeData>) {
  const sku = data.resource.attributes['sku'] as string | undefined;

  return (
    <div className={`node-card border-l-[#773ADC] ${selected ? 'ring-2 ring-[#773ADC]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <AzureLbIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#773ADC]">Load Balancer</p>
        </div>
      </div>
      {sku && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{sku}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#773ADC]" />
      <Handle type="source" position={Position.Right} className="!bg-[#773ADC]" />
    </div>
  );
}
