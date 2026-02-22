import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { AzurePipIcon } from '../icons/AzureIcons';

export function AzurePipNode({ data, selected }: NodeProps<GraphNodeData>) {
  const ipAddress = data.resource.attributes['ip_address'] as string | undefined;

  return (
    <div className={`node-card border-l-[#0078D4] ${selected ? 'ring-2 ring-[#0078D4]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <AzurePipIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#0078D4]">Public IP</p>
        </div>
      </div>
      {ipAddress && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{ipAddress}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#0078D4]" />
      <Handle type="source" position={Position.Right} className="!bg-[#0078D4]" />
    </div>
  );
}
