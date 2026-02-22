import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { S3Icon } from './icons/AwsIcons';

export function S3Node({ data, selected }: NodeProps<GraphNodeData>) {
  const bucket = data.resource.attributes['bucket'] as string | undefined;

  return (
    <div className={`node-card border-l-[#3F8624] ${selected ? 'ring-2 ring-[#3F8624]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <S3Icon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#3F8624]">S3 Bucket</p>
        </div>
      </div>
      {bucket && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{bucket}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#3F8624]" />
      <Handle type="source" position={Position.Right} className="!bg-[#3F8624]" />
    </div>
  );
}
