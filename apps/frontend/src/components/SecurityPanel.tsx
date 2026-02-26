import { useMemo } from 'react';
import type { CloudResource, GraphEdge } from '@infragraph/shared';
import type { ProviderFrontendConfig } from '@/providers/types';
import { runSecurityScan, SEVERITY_CONFIG, type SecurityFinding, type Severity } from '@/lib/securityRules';
import { GenericIcon } from './nodes/icons/AwsIcons';

interface SecurityPanelProps {
  resources: CloudResource[];
  edges: GraphEdge[];
  providerConfig: ProviderFrontendConfig;
  onSelectResource: (id: string) => void;
  onClose: () => void;
}

export function SecurityPanel({ resources, edges, providerConfig, onSelectResource, onClose }: SecurityPanelProps) {
  const findings = useMemo(() => runSecurityScan(resources, edges), [resources, edges]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) c[f.severity]++;
    return c;
  }, [findings]);

  const totalIssues = findings.filter((f) => f.severity !== 'info').length;

  // Group findings by resource
  const grouped = useMemo(() => {
    const map = new Map<string, SecurityFinding[]>();
    for (const f of findings) {
      if (!map.has(f.resourceId)) map.set(f.resourceId, []);
      map.get(f.resourceId)!.push(f);
    }
    return Array.from(map.entries());
  }, [findings]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Security Scan
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {totalIssues === 0 ? 'No issues found' : `${totalIssues} issue${totalIssues > 1 ? 's' : ''} found`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          aria-label="Close panel"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Severity summary */}
      <div className="flex gap-2 mb-4">
        {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div
              key={sev}
              className={`flex-1 rounded-lg px-2.5 py-2 text-center ${cfg.bg} ${cfg.darkBg} border border-slate-200/50 dark:border-slate-700/50`}
            >
              <p className="text-lg font-bold" style={{ color: cfg.color }}>{counts[sev]}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Findings list */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-3">
        {findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="h-12 w-12 text-green-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">All clear!</p>
            <p className="text-xs text-slate-400 mt-1">No security issues detected.</p>
          </div>
        ) : (
          grouped.map(([resourceId, resourceFindings]) => {
            const resource = resources.find((r) => r.id === resourceId);
            if (!resource) return null;
            const config = providerConfig.typeConfig[resource.type] ?? { label: resource.type, Icon: GenericIcon };
            const { Icon } = config;
            const worstSeverity = resourceFindings[0]!.severity;
            const sevCfg = SEVERITY_CONFIG[worstSeverity];

            return (
              <div key={resourceId} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Resource header */}
                <button
                  onClick={() => onSelectResource(resourceId)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate flex-1 text-left">
                    {resource.displayName}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ color: sevCfg.color, backgroundColor: sevCfg.color + '18' }}
                  >
                    {resourceFindings.length}
                  </span>
                  <svg className="h-3.5 w-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>

                {/* Findings for this resource */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {resourceFindings.map((f) => {
                    const fCfg = SEVERITY_CONFIG[f.severity];
                    return (
                      <div key={f.id} className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-0.5 shrink-0 inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: fCfg.color }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{f.title}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{f.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
