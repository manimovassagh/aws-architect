import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { AzureStorageIcon } from '../icons/AzureIcons';

export function AzureStorageNode({ data, selected }: NodeProps<GraphNodeData>) {
  const accountTier = data.resource.attributes['account_tier'] as string | undefined;

  return (
    <div className={`node-card border-l-[#008272] ${selected ? 'ring-2 ring-[#008272]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <AzureStorageIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#008272]">Storage Account</p>
        </div>
      </div>
      {accountTier && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{accountTier}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#008272]" />
      <Handle type="source" position={Position.Right} className="!bg-[#008272]" />
    </div>
  );
}
