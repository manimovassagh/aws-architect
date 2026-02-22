import type { CloudResource } from '@infragraph/shared';
import type { ProviderFrontendConfig } from '@/providers/types';
import { GenericIcon } from './nodes/icons/AwsIcons';

interface ResourceSummaryProps {
  resources: CloudResource[];
  hiddenTypes?: Set<string>;
  providerConfig: ProviderFrontendConfig;
  onToggleType?: (type: string) => void;
  onResetFilters?: () => void;
}

export function ResourceSummary({ resources, hiddenTypes, providerConfig, onToggleType, onResetFilters }: ResourceSummaryProps) {
  // Count resources by type, skip types with 0
  const counts = new Map<string, number>();
  for (const r of resources) {
    counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  }

  // Sort by count descending, then alphabetically
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const hasActiveFilters = hiddenTypes && hiddenTypes.size > 0;
  const visibleCount = hasActiveFilters
    ? resources.filter((r) => !hiddenTypes.has(r.type)).length
    : resources.length;

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm">
      <span className="text-xs font-medium text-slate-400 mr-1">{visibleCount} resources</span>
      <span className="text-slate-200 dark:text-slate-600">|</span>
      {entries.map(([type, count]) => {
        const config = providerConfig.typeConfig[type] ?? { label: type.replace(/^(aws_|azurerm_|google_)/, ''), Icon: GenericIcon };
        const { Icon, label } = config;
        const isHidden = hiddenTypes?.has(type) ?? false;
        return (
          <button
            key={type}
            onClick={() => onToggleType?.(type)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-opacity ${
              isHidden ? 'opacity-30 hover:opacity-60' : 'opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={`${isHidden ? 'Show' : 'Hide'} ${label} (${count})`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden xl:inline text-xs text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{count}</span>
          </button>
        );
      })}
      {hasActiveFilters && (
        <>
          <span className="text-slate-200 dark:text-slate-600 ml-1">|</span>
          <button
            onClick={onResetFilters}
            className="text-xs font-medium text-violet-500 hover:text-violet-700 dark:hover:text-violet-400 ml-1 transition-colors"
          >
            Reset
          </button>
        </>
      )}
    </div>
  );
}
