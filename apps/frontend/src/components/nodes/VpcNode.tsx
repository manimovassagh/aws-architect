import type { NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function VpcNode({ data, selected }: NodeProps<GraphNodeData>) {
  const cidr = data.resource.attributes['cidr_block'] as string | undefined;

  return (
    <div
      className={`
        h-full w-full rounded-lg border-2 border-blue-500/60 bg-blue-950/20 p-3
        ${selected ? 'ring-2 ring-white' : ''}
      `}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
        <span>🌐</span>
        <span>{data.label}</span>
        {cidr && <span className="text-xs text-blue-400/70">{cidr}</span>}
      </div>
    </div>
  );
}
