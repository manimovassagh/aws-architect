import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';
import { RdsIcon } from './icons/AwsIcons';

export function RdsNode({ data, selected }: NodeProps<GraphNodeData>) {
  const engine = data.resource.attributes['engine'] as string | undefined;

  return (
    <div className={`node-card border-l-[#3B48CC] ${selected ? 'ring-2 ring-[#3B48CC]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <RdsIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#3B48CC]">RDS Database</p>
        </div>
      </div>
      {engine && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{engine}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#3B48CC]" />
      <Handle type="source" position={Position.Right} className="!bg-[#3B48CC]" />
    </div>
  );
}
