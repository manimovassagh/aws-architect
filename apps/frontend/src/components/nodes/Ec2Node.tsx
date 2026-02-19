import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';
import { Ec2Icon } from './icons/AwsIcons';

export function Ec2Node({ data, selected }: NodeProps<GraphNodeData>) {
  const instanceType = data.resource.attributes['instance_type'] as string | undefined;

  return (
    <div className={`node-card border-l-[#ED7100] ${selected ? 'ring-2 ring-[#ED7100]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <Ec2Icon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#ED7100]">EC2 Instance</p>
        </div>
      </div>
      {instanceType && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{instanceType}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#ED7100]" />
      <Handle type="source" position={Position.Right} className="!bg-[#ED7100]" />
    </div>
  );
}
