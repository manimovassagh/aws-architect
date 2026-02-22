import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { SubnetIcon } from './icons/AwsIcons';

export function SubnetNode({ data, selected }: NodeProps<GraphNodeData>) {
  const cidr = data.resource.attributes['cidr_block'] as string | undefined;
  const isPublic = data.resource.attributes['map_public_ip_on_launch'] === true;

  return (
    <div className={`h-full w-full rounded-lg border-2 border-dashed border-[#147EBA] bg-[#147EBA]/5 p-3 ${selected ? 'ring-2 ring-[#147EBA]/30' : ''}`}>
      <div className="flex items-center gap-2">
        <SubnetIcon className="h-6 w-6 shrink-0" />
        <span className="text-sm font-semibold text-[#147EBA]">{data.label}</span>
        {isPublic && (
          <span className="rounded-full bg-[#147EBA]/10 px-2 py-0.5 text-[10px] font-semibold text-[#147EBA]">
            Public
          </span>
        )}
        {cidr && <span className="text-xs text-[#147EBA]/70">{cidr}</span>}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-[#147EBA] !opacity-0" />
      <Handle type="source" position={Position.Right} className="!bg-[#147EBA] !opacity-0" />
    </div>
  );
}
