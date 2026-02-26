import { useEffect, useRef, useState } from 'react';
import type { CloudResource } from '@infragraph/shared';
import type { ProviderFrontendConfig } from '@/providers/types';
import { GenericIcon } from './nodes/icons/AwsIcons';

const MAX_VISIBLE = 5;

interface ResourceSummaryProps {
  resources: CloudResource[];
  hiddenTypes?: Set<string>;
  providerConfig: ProviderFrontendConfig;
  onToggleType?: (type: string) => void;
  onResetFilters?: () => void;
}

export function ResourceSummary({ resources, hiddenTypes, providerConfig, onToggleType, onResetFilters }: ResourceSummaryProps) {
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!showOverflow) return;
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showOverflow]);

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

  const visibleEntries = entries.slice(0, MAX_VISIBLE);
  const overflowEntries = entries.slice(MAX_VISIBLE);

  function renderTypeButton(type: string, count: number) {
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
  }

  return (
    <div className="flex items-center gap-1 min-w-0 flex-nowrap">
      <span className="text-xs font-medium text-slate-400 mr-1">{visibleCount} resources</span>
      <span className="text-slate-200 dark:text-slate-600">|</span>
      {visibleEntries.map(([type, count]) => renderTypeButton(type, count))}
      {overflowEntries.length > 0 && (
        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setShowOverflow((v) => !v)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title={`${overflowEntries.length} more resource types`}
          >
            +{overflowEntries.length}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showOverflow && (
            <div className="absolute left-0 top-full mt-1 w-48 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-50">
              {overflowEntries.map(([type, count]) => {
                const config = providerConfig.typeConfig[type] ?? { label: type.replace(/^(aws_|azurerm_|google_)/, ''), Icon: GenericIcon };
                const { Icon, label } = config;
                const isHidden = hiddenTypes?.has(type) ?? false;
                return (
                  <button
                    key={type}
                    onClick={() => onToggleType?.(type)}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors ${
                      isHidden
                        ? 'opacity-40 hover:opacity-70'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    title={`${isHidden ? 'Show' : 'Hide'} ${label} (${count})`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300 flex-1 text-left">{label}</span>
                    <span className="font-medium text-slate-500 dark:text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
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
