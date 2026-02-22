import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { GenericIcon } from './icons/AwsIcons';

export function GenericNode({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div className={`node-card border-l-[#7B8794] ${selected ? 'ring-2 ring-[#7B8794]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <GenericIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#7B8794]">{data.resource.type}</p>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-[#7B8794]" />
      <Handle type="source" position={Position.Right} className="!bg-[#7B8794]" />
    </div>
  );
}
