import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { AzureNsgIcon } from '../icons/AzureIcons';

export function AzureNsgNode({ data, selected }: NodeProps<GraphNodeData>) {
  const name = data.resource.attributes['name'] as string | undefined;

  return (
    <div className={`node-card border-l-[#D13438] ${selected ? 'ring-2 ring-[#D13438]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <AzureNsgIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#D13438]">Network Security Group</p>
        </div>
      </div>
      {name && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{name}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#D13438]" />
      <Handle type="source" position={Position.Right} className="!bg-[#D13438]" />
    </div>
  );
}
