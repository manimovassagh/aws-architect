import { useState, useMemo } from 'react';
import type { CloudResource, GraphEdge } from '@infragraph/shared';
import type { ProviderFrontendConfig } from '@/providers/types';
import type { CostEstimate } from '@/lib/costEstimator';
import { formatCost } from '@/lib/costEstimator';
import { GenericIcon } from './nodes/icons/AwsIcons';

type SortKey = 'displayName' | 'type' | 'region' | 'cost';
type SortDir = 'asc' | 'desc';

interface InventoryTableProps {
  resources: CloudResource[];
  edges: GraphEdge[];
  hiddenTypes?: Set<string>;
  searchQuery: string;
  providerConfig: ProviderFrontendConfig;
  onSelectResource: (id: string) => void;
  selectedResourceId: string | null;
  costEstimates?: CostEstimate[];
}

function matchesSearch(r: CloudResource, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    r.displayName.toLowerCase().includes(q) ||
    r.type.toLowerCase().includes(q) ||
    r.id.toLowerCase().includes(q) ||
    r.name.toLowerCase().includes(q) ||
    Object.values(r.tags).some((v) => v.toLowerCase().includes(q)) ||
    Object.values(r.attributes).some((v) => typeof v === 'string' && v.toLowerCase().includes(q))
  );
}

export function InventoryTable({
  resources,
  edges,
  hiddenTypes,
  searchQuery,
  providerConfig,
  onSelectResource,
  selectedResourceId,
  costEstimates,
}: InventoryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('type');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Precompute cost lookup
  const costByResource = useMemo(() => {
    if (!costEstimates) return null;
    const map = new Map<string, number>();
    for (const e of costEstimates) map.set(e.resourceId, e.monthlyCost);
    return map;
  }, [costEstimates]);

  // Precompute connection counts
  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of edges) {
      counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
      counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
    }
    return counts;
  }, [edges]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = resources;
    if (hiddenTypes && hiddenTypes.size > 0) {
      result = result.filter((r) => !hiddenTypes.has(r.type));
    }
    if (searchQuery) {
      result = result.filter((r) => matchesSearch(r, searchQuery));
    }
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'displayName') {
        cmp = a.displayName.localeCompare(b.displayName);
      } else if (sortKey === 'type') {
        const labelA = providerConfig.typeConfig[a.type]?.label ?? a.type;
        const labelB = providerConfig.typeConfig[b.type]?.label ?? b.type;
        cmp = labelA.localeCompare(labelB);
      } else if (sortKey === 'region') {
        cmp = (a.region ?? '').localeCompare(b.region ?? '');
      } else if (sortKey === 'cost' && costByResource) {
        cmp = (costByResource.get(a.id) ?? 0) - (costByResource.get(b.id) ?? 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [resources, hiddenTypes, searchQuery, sortKey, sortDir, providerConfig.typeConfig, costByResource]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIcon(column: SortKey) {
    if (sortKey !== column) {
      return (
        <svg className="h-3 w-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      );
    }
    return sortDir === 'asc' ? (
      <svg className="h-3 w-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    ) : (
      <svg className="h-3 w-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 pt-14">
      {/* Table header */}
      <div className="sticky top-0 z-[5] bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className={`grid gap-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${costByResource ? 'grid-cols-[1fr_140px_120px_80px_80px]' : 'grid-cols-[1fr_140px_120px_80px]'}`}>
          <button onClick={() => handleSort('displayName')} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-left">
            Name {sortIcon('displayName')}
          </button>
          <button onClick={() => handleSort('type')} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-left">
            Type {sortIcon('type')}
          </button>
          <button onClick={() => handleSort('region')} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-left">
            Region {sortIcon('region')}
          </button>
          <span className="text-right">Links</span>
          {costByResource && (
            <button onClick={() => handleSort('cost')} className="flex items-center gap-1 justify-end hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Est. Cost {sortIcon('cost')}
            </button>
          )}
        </div>
      </div>

      {/* Table body */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
            <svg className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm">No resources match your filters</p>
          </div>
        ) : (
          filtered.map((r) => {
            const config = providerConfig.typeConfig[r.type] ?? { label: r.type.replace(/^(aws_|azurerm_|google_)/, ''), Icon: GenericIcon };
            const { Icon, label } = config;
            const conns = connectionCounts.get(r.id) ?? 0;
            const isSelected = r.id === selectedResourceId;
            const tags = Object.entries(r.tags).filter(([k]) => k !== 'Name');

            return (
              <button
                key={r.id}
                onClick={() => onSelectResource(r.id)}
                className={`w-full grid gap-2 px-4 py-3 text-left border-b border-slate-100 dark:border-slate-800 transition-colors ${costByResource ? 'grid-cols-[1fr_140px_120px_80px_80px]' : 'grid-cols-[1fr_140px_120px_80px]'} ${
                  isSelected
                    ? 'bg-violet-50 dark:bg-violet-950/30 border-l-2 border-l-violet-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Name + ID */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {r.displayName}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5 ml-7">
                    {r.id}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-7">
                      {tags.slice(0, 3).map(([k, v]) => (
                        <span key={k} className="inline-flex text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5">
                          {k}: {v}
                        </span>
                      ))}
                      {tags.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Type */}
                <div className="flex items-start pt-0.5">
                  <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
                </div>

                {/* Region */}
                <div className="flex items-start pt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {r.region ?? '—'}
                  </span>
                </div>

                {/* Connections */}
                <div className="flex items-start justify-end pt-0.5">
                  {conns > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.135a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.14" />
                      </svg>
                      {conns}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                  )}
                </div>

                {/* Cost */}
                {costByResource && (
                  <div className="flex items-start justify-end pt-0.5">
                    {costByResource.has(r.id) ? (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCost(costByResource.get(r.id)!)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {filtered.length} of {resources.length} resources
        </span>
        {costByResource && (
          <span className="text-[10px] text-amber-600/60 dark:text-amber-400/50">
            Cost estimates only — not for budgeting
          </span>
        )}
      </div>
    </div>
  );
}
