import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNodeData } from '@infragraph/shared';
import { LambdaIcon } from './icons/AwsIcons';

export function LambdaNode({ data, selected }: NodeProps<GraphNodeData>) {
  const runtime = data.resource.attributes['runtime'] as string | undefined;

  return (
    <div className={`node-card border-l-[#ED7100] ${selected ? 'ring-2 ring-[#ED7100]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <LambdaIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{data.label}</p>
          <p className="text-[11px] font-medium text-[#ED7100]">Lambda Function</p>
        </div>
      </div>
      {runtime && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{runtime}</p>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[#ED7100]" />
      <Handle type="source" position={Position.Right} className="!bg-[#ED7100]" />
    </div>
  );
}
