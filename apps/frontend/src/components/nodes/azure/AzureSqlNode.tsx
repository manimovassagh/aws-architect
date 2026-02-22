import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { AzureSqlIcon } from '../icons/AzureIcons';

export function AzureSqlNode({ data, selected }: NodeProps<GraphNodeData>) {
  const version = data.resource.attributes['version'] as string | undefined;

  return (
    <div className={`node-card border-l-[#0F4C75] ${selected ? 'ring-2 ring-[#0F4C75]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <AzureSqlIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#0F4C75]">SQL Database</p>
        </div>
      </div>
      {version && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">v{version}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#0F4C75]" />
      <Handle type="source" position={Position.Right} className="!bg-[#0F4C75]" />
    </div>
  );
}
