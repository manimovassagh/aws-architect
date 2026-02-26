import type { CostEstimate } from '@/lib/costEstimator';
import { formatCost, totalMonthlyCost } from '@/lib/costEstimator';
import type { ProviderFrontendConfig } from '@/providers/types';
import { GenericIcon } from './nodes/icons/AwsIcons';

interface CostPanelProps {
  estimates: CostEstimate[];
  providerConfig: ProviderFrontendConfig;
  onSelectResource?: (id: string) => void;
  onClose: () => void;
}

export function CostPanel({ estimates, providerConfig, onSelectResource, onClose }: CostPanelProps) {
  const total = totalMonthlyCost(estimates);
  const sorted = [...estimates].sort((a, b) => b.monthlyCost - a.monthlyCost);

  return (
    <div className="absolute bottom-4 right-4 z-20 w-72 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            Est. {formatCost(total)}/mo
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* List */}
      <div className="max-h-64 overflow-y-auto py-1">
        {sorted.map((est) => {
          const config = providerConfig.typeConfig[est.resourceType] ?? {
            label: est.resourceType.replace(/^(aws_|azurerm_|google_)/, ''),
            Icon: GenericIcon,
          };
          const { Icon } = config;
          return (
            <button
              key={est.resourceId}
              onClick={() => onSelectResource?.(est.resourceId)}
              className="flex items-center gap-2 w-full px-4 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-slate-700 dark:text-slate-300 flex-1 text-left truncate">{est.label}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                {formatCost(est.monthlyCost)}
              </span>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <p className="px-4 py-3 text-xs text-slate-400 text-center">No estimable resources</p>
        )}
      </div>
      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/10">
        <p className="text-[10px] text-amber-700/70 dark:text-amber-400/60 leading-relaxed">
          Estimates only. Based on approximate on-demand list prices (us-east-1).
          Not a substitute for official cloud pricing calculators.
          No guarantee of accuracy — do not use for budgeting or financial decisions.
        </p>
      </div>
    </div>
  );
}
