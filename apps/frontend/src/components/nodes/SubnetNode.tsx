import type { NodeProps } from 'reactflow';
import type { GraphNodeData } from '@awsarchitect/shared';

export function SubnetNode({ data, selected }: NodeProps<GraphNodeData>) {
  const cidr = data.resource.attributes['cidr_block'] as string | undefined;
  const isPublic = data.resource.attributes['map_public_ip_on_launch'] === true;

  return (
    <div
      className={`
        h-full w-full rounded-md border-2 border-emerald-500/50 bg-emerald-950/15 p-3
        ${selected ? 'ring-2 ring-white' : ''}
      `}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <span>🔲</span>
        <span>{data.label}</span>
        {cidr && <span className="text-xs text-emerald-400/60">{cidr}</span>}
        {isPublic && (
          <span className="text-[10px] uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            public
          </span>
        )}
      </div>
    </div>
  );
}
