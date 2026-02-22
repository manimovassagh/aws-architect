import type { CloudResource } from '@infragraph/shared';
import type { ProviderFrontendConfig } from '@/providers/types';
import { GenericIcon } from './nodes/icons/AwsIcons';

interface ResourceSummaryProps {
  resources: CloudResource[];
  hiddenTypes?: Set<string>;
  providerConfig: ProviderFrontendConfig;
  onToggleType?: (type: string) => void;
}

export function ResourceSummary({ resources, hiddenTypes, providerConfig, onToggleType }: ResourceSummaryProps) {
  // Count resources by type, skip types with 0
  const counts = new Map<string, number>();
  for (const r of resources) {
    counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  }

  // Sort by count descending, then alphabetically
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const visibleCount = hiddenTypes
    ? resources.filter((r) => !hiddenTypes.has(r.type)).length
    : resources.length;

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm">
      <span className="text-xs font-medium text-slate-400 mr-1">{visibleCount} resources</span>
      <span className="text-slate-200">|</span>
      {entries.map(([type, count]) => {
        const config = providerConfig.typeConfig[type] ?? { label: type.replace(/^(aws_|azurerm_|google_)/, ''), Icon: GenericIcon };
        const { Icon } = config;
        const isHidden = hiddenTypes?.has(type) ?? false;
        return (
          <button
            key={type}
            onClick={() => onToggleType?.(type)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-opacity ${
              isHidden ? 'opacity-30' : 'opacity-100 hover:bg-slate-100'
            }`}
            title={`${isHidden ? 'Show' : 'Hide'} ${config.label} (${count})`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
