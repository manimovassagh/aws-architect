import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { CloudProvider, ParseResponse } from '@infragraph/shared';
import type { ProviderFrontendConfig } from '@/providers/types';
import { getProviderFrontendConfig } from '@/providers';
import { ProviderSelect } from '@/components/ProviderSelect';
import { ParsingProgress } from '@/components/ParsingProgress';
import { Canvas, type CanvasHandle } from '@/components/Canvas';
import { NodeDetailPanel } from '@/components/NodeDetailPanel';
import { ResourceSummary } from '@/components/ResourceSummary';
import { SearchBar, type SearchBarHandle } from '@/components/SearchBar';
import { InventoryTable } from '@/components/InventoryTable';
import { SecurityPanel } from '@/components/SecurityPanel';
import { runSecurityScan, SEVERITY_CONFIG } from '@/lib/securityRules';
import { relayoutNodes, LAYOUT_OPTIONS, type LayoutMode } from '@/lib/layoutEngine';
import { estimateCosts, totalMonthlyCost, formatCost } from '@/lib/costEstimator';
import { CostPanel } from '@/components/CostPanel';
import { AiChatPanel } from '@/components/AiChatPanel';
import { parseFile, parseHcl, parseCfn, parsePlan, saveSession } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { PROVIDER_COLORS } from '@/lib/constants';
import { UserMenu } from '@/components/UserMenu';

const PROVIDER_META: Record<string, { label: string; color: string }> = {
  aws: { label: 'AWS', color: PROVIDER_COLORS.aws },
  azure: { label: 'Azure', color: PROVIDER_COLORS.azure },
  gcp: { label: 'GCP', color: PROVIDER_COLORS.gcp },
};

const IAC_SOURCE_LABELS: Record<string, string> = {
  'terraform-state': 'Terraform State',
  'terraform-hcl': 'Terraform HCL',
  'terraform-plan': 'Terraform Plan',
  'cloudformation': 'CloudFormation',
  'cdk': 'AWS CDK',
};

type AppState =
  | { view: 'landing' }
  | { view: 'loading'; fileName: string }
  | { view: 'error'; message: string; fileName?: string }
  | { view: 'canvas'; provider: CloudProvider; data: ParseResponse; selectedNodeId: string | null; fileName: string; iacLabel?: string };

export function HomePage() {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>({ view: 'landing' });
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [darkMode, toggleDarkMode] = useDarkMode();
  const [providerConfig, setProviderConfig] = useState<ProviderFrontendConfig | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [blastRadiusMode, setBlastRadiusMode] = useState(false);
  const [blastRadiusCount, setBlastRadiusCount] = useState(0);
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [showSecurity, setShowSecurity] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hierarchical');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<SearchBarHandle>(null);
  const canvasRef = useRef<CanvasHandle>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Sync view with route using derived state (no useEffect needed).
  // When back button changes pathname from /canvas → /, reset to landing.
  const [lastPathname, setLastPathname] = useState(location.pathname);
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname);
    if (lastPathname === '/canvas' && location.pathname === '/' && state.view === 'canvas') {
      setProviderConfig(null);
      setState({ view: 'landing' });
    }
  }

  // Hydrate canvas from session history (if navigated from /history)
  useEffect(() => {
    const raw = sessionStorage.getItem('loadSession');
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as { provider: CloudProvider; fileName: string; data: ParseResponse };
      getProviderFrontendConfig(session.provider).then((config) => {
        sessionStorage.removeItem('loadSession');
        setProviderConfig(config);
        setState({
          view: 'canvas',
          provider: session.provider,
          data: session.data,
          selectedNodeId: null,
          fileName: session.fileName,
        });
      });
    } catch {
      sessionStorage.removeItem('loadSession');
    }
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchBarRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        searchBarRef.current?.clear();
        setSearchQuery('');
        setState((prev) =>
          prev.view === 'canvas' ? { ...prev, selectedNodeId: null } : prev
        );
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        setShowShortcuts((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  async function handleSmartUpload(files: File[], mode: 'tfstate' | 'hcl' | 'cfn' | 'cdk' | 'plan') {
    const fileName = files.length === 1
      ? files[0]!.name
      : `${files.length} ${mode === 'hcl' ? '.tf' : ''} files`;
    setState({ view: 'loading', fileName });
    try {
      let data: ParseResponse;
      if (mode === 'tfstate') {
        data = await parseFile(files[0]!);
      } else if (mode === 'hcl') {
        data = await parseHcl(files);
      } else if (mode === 'cdk') {
        data = await parseCfn(files[0]!, 'cdk');
      } else if (mode === 'plan') {
        data = await parsePlan(files[0]!);
      } else {
        data = await parseCfn(files[0]!);
      }
      if (data.resources.length === 0) {
        setState({
          view: 'error',
          message: mode === 'cfn'
            ? 'No supported resources found in the CloudFormation template.'
            : 'No resources found. Make sure the file contains managed Terraform resources.',
          fileName,
        });
        return;
      }
      const config = await getProviderFrontendConfig(data.provider);
      setProviderConfig(config);
      const iacLabel = data.iacSource ? IAC_SOURCE_LABELS[data.iacSource] : undefined;
      setState({ view: 'canvas', provider: data.provider, data, selectedNodeId: null, fileName, iacLabel });
      navigate('/canvas');

      // Fire-and-forget save if logged in
      if (user) {
        void saveSession({
          provider: data.provider,
          fileName,
          resourceCount: data.resources.length,
          data,
        }).catch(() => {}); // silent — never block UI
      }
    } catch (err) {
      setState({
        view: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
        fileName,
      });
    }
  }

  async function handleTrySample(provider: CloudProvider) {
    const sampleMap: Record<CloudProvider, string> = {
      aws: '/sample.tfstate',
      azure: '/azure-sample.tfstate',
      gcp: '/gcp-sample.tfstate',
    };
    const sampleUrl = sampleMap[provider];
    const sampleName = sampleUrl.slice(1); // remove leading /
    setState({ view: 'loading', fileName: sampleName });
    try {
      const res = await fetch(sampleUrl);
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/json' });
      const file = new File([blob], sampleName);
      const data = await parseFile(file);
      if (data.resources.length === 0) {
        setState({ view: 'error', message: 'No resources found in sample file.', fileName: sampleName });
        return;
      }
      const config = await getProviderFrontendConfig(data.provider);
      setProviderConfig(config);
      setState({ view: 'canvas', provider: data.provider, data, selectedNodeId: null, fileName: sampleName });
      navigate('/canvas');

      // Fire-and-forget save if logged in
      if (user) {
        void saveSession({
          provider: data.provider,
          fileName: sampleName,
          resourceCount: data.resources.length,
          data,
        }).catch(() => {});
      }
    } catch (err) {
      setState({
        view: 'error',
        message: err instanceof Error ? err.message : 'Failed to load sample',
        fileName: sampleName,
      });
    }
  }

  async function handleTryCfnSample() {
    const sampleName = 'cfn-sample.json';
    setState({ view: 'loading', fileName: sampleName });
    try {
      const res = await fetch('/cfn-sample.json');
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/json' });
      const file = new File([blob], sampleName);
      const data = await parseCfn(file);
      if (data.resources.length === 0) {
        setState({ view: 'error', message: 'No resources found in sample template.', fileName: sampleName });
        return;
      }
      const config = await getProviderFrontendConfig(data.provider);
      setProviderConfig(config);
      const iacLabel = data.iacSource ? IAC_SOURCE_LABELS[data.iacSource] : undefined;
      setState({ view: 'canvas', provider: data.provider, data, selectedNodeId: null, fileName: sampleName, iacLabel });
      navigate('/canvas');

      if (user) {
        void saveSession({
          provider: data.provider,
          fileName: sampleName,
          resourceCount: data.resources.length,
          data,
        }).catch(() => {});
      }
    } catch (err) {
      setState({
        view: 'error',
        message: err instanceof Error ? err.message : 'Failed to load sample',
        fileName: sampleName,
      });
    }
  }

  async function handleTryPlanSample() {
    const sampleName = 'plan-sample.json';
    setState({ view: 'loading', fileName: sampleName });
    try {
      const res = await fetch('/plan-sample.json');
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/json' });
      const file = new File([blob], sampleName);
      const data = await parsePlan(file);
      if (data.resources.length === 0) {
        setState({ view: 'error', message: 'No resources found in sample plan.', fileName: sampleName });
        return;
      }
      const config = await getProviderFrontendConfig(data.provider);
      setProviderConfig(config);
      const iacLabel = data.iacSource ? IAC_SOURCE_LABELS[data.iacSource] : undefined;
      setState({ view: 'canvas', provider: data.provider, data, selectedNodeId: null, fileName: sampleName, iacLabel });
      navigate('/canvas');

      if (user) {
        void saveSession({
          provider: data.provider,
          fileName: sampleName,
          resourceCount: data.resources.length,
          data,
        }).catch(() => {});
      }
    } catch (err) {
      setState({
        view: 'error',
        message: err instanceof Error ? err.message : 'Failed to load sample',
        fileName: sampleName,
      });
    }
  }

  async function handleGitHubParsed(data: ParseResponse, fileName: string) {
    if (data.resources.length === 0) {
      setState({
        view: 'error',
        message: 'No resources found in this Terraform project.',
        fileName,
      });
      return;
    }
    const config = await getProviderFrontendConfig(data.provider);
    setProviderConfig(config);
    setState({ view: 'canvas', provider: data.provider, data, selectedNodeId: null, fileName });
    navigate('/canvas');

    // Fire-and-forget save if logged in
    if (user) {
      void saveSession({
        provider: data.provider,
        fileName,
        resourceCount: data.resources.length,
        data,
      }).catch(() => {});
    }
  }

  function handleNewUpload() {
    setProviderConfig(null);
    setState({ view: 'landing' });
    navigate('/');
  }

  function handleQuickUpload() {
    fileInputRef.current?.click();
  }

  function onQuickFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files ?? []);
    if (fileList.length === 0) return;

    // Auto-detect mode from extensions
    const hasTf = fileList.some((f) => f.name.endsWith('.tf'));
    const hasTfstate = fileList.some((f) => f.name.endsWith('.tfstate'));
    const hasCfn = fileList.some((f) => {
      const name = f.name.toLowerCase();
      return name.endsWith('.yaml') || name.endsWith('.yml') || name.endsWith('.template');
    });
    const hasJson = fileList.some((f) => f.name.endsWith('.json'));

    const typeCount = [hasTf, hasTfstate, hasCfn].filter(Boolean).length;
    if (typeCount > 1) return; // mixed — ignore

    if (hasTf) {
      handleSmartUpload(fileList, 'hcl');
    } else if (hasCfn) {
      handleSmartUpload([fileList[0]!], 'cfn');
    } else if (hasTfstate) {
      handleSmartUpload([fileList[0]!], 'tfstate');
    } else if (hasJson && fileList[0]) {
      // Ambiguous .json — read content to decide
      void fileList[0].text().then((text) => {
        try {
          const obj = JSON.parse(text);
          if (obj?.resource_changes && Array.isArray(obj.resource_changes)) {
            // Terraform plan JSON
            handleSmartUpload([fileList[0]!], 'plan');
          } else if (obj?.AWSTemplateFormatVersion || (obj?.Resources && typeof obj.Resources === 'object')) {
            // Detect CDK via metadata
            const metadata = obj?.Metadata as Record<string, unknown> | undefined;
            const isCdk = metadata?.['aws:cdk:version'] || metadata?.['aws:cdk:path-metadata'];
            handleSmartUpload([fileList[0]!], isCdk ? 'cdk' : 'cfn');
          } else {
            handleSmartUpload([fileList[0]!], 'tfstate');
          }
        } catch {
          handleSmartUpload([fileList[0]!], 'tfstate');
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Compute laid-out nodes based on selected layout mode
  const canvasNodes = useMemo(
    () => (state.view === 'canvas' ? state.data.nodes : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recompute when data changes
    [state.view, state.view === 'canvas' ? state.data : null],
  );
  const layoutNodes = useMemo(
    () => relayoutNodes(canvasNodes, layoutMode),
    [canvasNodes, layoutMode],
  );

  // Cost estimation
  const canvasResources = useMemo(
    () => (state.view === 'canvas' ? state.data.resources : []),
    [state.view, state.view === 'canvas' ? state.data : null], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const costEstimates = useMemo(
    () => estimateCosts(canvasResources),
    [canvasResources],
  );
  const costTotal = useMemo(
    () => totalMonthlyCost(costEstimates),
    [costEstimates],
  );
  const costMap = useMemo(() => {
    if (!showCosts || costEstimates.length === 0) return undefined;
    const map = new Map<string, string>();
    for (const e of costEstimates) {
      map.set(e.resourceId, formatCost(e.monthlyCost) + '/mo');
    }
    return map;
  }, [showCosts, costEstimates]);

  // Security scan (memoized to avoid O(resources × rules) on every render)
  const securityFindings = useMemo(
    () => (state.view === 'canvas' ? runSecurityScan(state.data.resources, state.data.edges) : []),
    [state.view, canvasResources], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const securityIssueCount = useMemo(
    () => securityFindings.filter((f) => f.severity !== 'info').length,
    [securityFindings],
  );
  const securityWorstColor = useMemo(() => {
    const worst = securityFindings.length > 0 ? securityFindings[0]!.severity : null;
    return worst ? SEVERITY_CONFIG[worst].color : '#6b7280';
  }, [securityFindings]);

  // Direct /canvas access with no data → redirect to landing
  // (but allow through if session is being hydrated from /history)
  if (location.pathname === '/canvas' && state.view !== 'canvas' && !sessionStorage.getItem('loadSession')) {
    return <Navigate to="/" replace />;
  }

  // Landing view
  if (state.view === 'landing') {
    return (
      <ProviderSelect
        onUpload={handleSmartUpload}
        onTrySample={handleTrySample}
        onTryCfnSample={handleTryCfnSample}
        onTryPlanSample={handleTryPlanSample}
        onGitHubParsed={handleGitHubParsed}
      />
    );
  }

  if (state.view === 'loading') {
    return <ParsingProgress fileName={state.fileName} />;
  }

  if (state.view === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <svg className="h-12 w-12 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        {state.fileName && (
          <p className="text-slate-400 text-xs font-mono">{state.fileName}</p>
        )}
        <p className="text-red-600 text-center max-w-md">{state.message}</p>
        <button
          onClick={handleNewUpload}
          className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Try again
        </button>
      </main>
    );
  }

  if (state.view === 'canvas' && providerConfig) {
    const selectedResource = state.selectedNodeId
      ? state.data.resources.find((r) => r.id === state.selectedNodeId)
      : null;

    return (
      <div className="flex flex-col h-screen">
        <input
          ref={fileInputRef}
          type="file"
          accept=".tfstate,.json,.tf,.yaml,.yml,.template"
          multiple
          onChange={onQuickFileChange}
          className="hidden"
        />

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative">
            {/* Unified toolbar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm min-w-0">
                <ResourceSummary
                  resources={state.data.resources}
                  hiddenTypes={hiddenTypes}
                  providerConfig={providerConfig}
                  onToggleType={(type) =>
                    setHiddenTypes((prev) => {
                      const next = new Set(prev);
                      if (next.has(type)) next.delete(type);
                      else next.add(type);
                      return next;
                    })
                  }
                  onResetFilters={() => setHiddenTypes(new Set())}
                />
              </div>
              <SearchBar ref={searchBarRef} onSearch={setSearchQuery} />
              <div className="flex items-center gap-1.5 shrink-0">
              {/* Security scan button */}
              <button
                onClick={() => { setShowSecurity((v) => !v); if (!showSecurity) { setShowAi(false); setState((prev) => prev.view === 'canvas' ? { ...prev, selectedNodeId: null } : prev); } }}
                className={`flex items-center gap-1.5 rounded-lg backdrop-blur-sm border px-3 py-1.5 shadow-sm text-xs transition-colors ${
                  showSecurity
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                    : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
                title="Security scan"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                {securityIssueCount > 0 && (
                  <span className="font-semibold px-1.5 py-0.5 rounded-full text-[10px]" style={{ color: securityWorstColor, backgroundColor: securityWorstColor + '18' }}>
                    {securityIssueCount}
                  </span>
                )}
              </button>
              {/* Cost estimation toggle */}
              <button
                onClick={() => setShowCosts((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg backdrop-blur-sm border px-3 py-1.5 shadow-sm text-xs transition-colors ${
                  showCosts
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
                title={showCosts ? 'Hide cost estimates' : 'Show cost estimates'}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden xl:inline">Costs</span>
                {costTotal > 0 && (
                  <span className={`font-semibold text-[10px] ${showCosts ? '' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatCost(costTotal)}/mo
                  </span>
                )}
              </button>
              {/* AI assistant toggle */}
              <button
                onClick={() => { setShowAi((v) => !v); if (!showAi) { setShowSecurity(false); setState((prev) => prev.view === 'canvas' ? { ...prev, selectedNodeId: null } : prev); } }}
                className={`flex items-center gap-1.5 rounded-lg backdrop-blur-sm border px-3 py-1.5 shadow-sm text-xs transition-colors ${
                  showAi
                    ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                    : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
                title="AI Assistant"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                <span className="hidden xl:inline">AI</span>
              </button>
              {/* View toggle: shows "Table" in graph mode, "Graph" in table mode */}
              <button
                onClick={() => setViewMode((v) => v === 'graph' ? 'table' : 'graph')}
                className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                title={viewMode === 'graph' ? 'Switch to table view' : 'Switch to graph view'}
              >
                {viewMode === 'graph' ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v.75" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                )}
                <span className="hidden xl:inline">{viewMode === 'graph' ? 'Table' : 'Graph'}</span>
              </button>
              {/* Minimap toggle (graph mode only) */}
              {viewMode === 'graph' && (
                <button
                  onClick={() => setShowMinimap((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg backdrop-blur-sm border px-2.5 py-1.5 shadow-sm text-xs transition-colors ${
                    showMinimap
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
                  }`}
                  title={showMinimap ? 'Hide minimap' : 'Show minimap'}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                </button>
              )}
              {/* Layout picker */}
              {viewMode === 'graph' && (
                <div className="relative">
                  <button
                    onClick={() => setShowLayoutMenu((v) => !v)}
                    onBlur={() => setTimeout(() => setShowLayoutMenu(false), 150)}
                    className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                    title="Change layout"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    <span className="hidden xl:inline">{LAYOUT_OPTIONS.find((o) => o.value === layoutMode)?.label ?? 'Layout'}</span>
                    <svg className="h-3 w-3 xl:-ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {showLayoutMenu && (
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-50">
                      {LAYOUT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onMouseDown={() => { setLayoutMode(opt.value); setShowLayoutMenu(false); }}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${
                            layoutMode === opt.value
                              ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 font-medium'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {opt.label}
                          {layoutMode === opt.value && (
                            <svg className="h-3 w-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  onBlur={() => setTimeout(() => setShowExportMenu(false), 150)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                  title="Export diagram"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span className="hidden xl:inline">Export</span>
                  <svg className="h-3 w-3 xl:-ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-50">
                    <button
                      onMouseDown={() => { canvasRef.current?.exportPng(); setShowExportMenu(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      <div className="text-left">
                        <span className="font-medium">PNG Image</span>
                        <span className="block text-[10px] text-slate-400">Static screenshot</span>
                      </div>
                    </button>
                    <button
                      onMouseDown={() => { canvasRef.current?.exportHtml(); setShowExportMenu(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                      </svg>
                      <div className="text-left">
                        <span className="font-medium">Interactive HTML</span>
                        <span className="block text-[10px] text-slate-400">Shareable, works offline</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleQuickUpload}
                className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                title="Upload a different file"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <span className="hidden xl:inline">New file</span>
              </button>
              <button
                onClick={() => setShowShortcuts(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                title="Keyboard shortcuts (?)"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </button>
              <button
                onClick={handleNewUpload}
                className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                title="Return to home page"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                <span className="hidden xl:inline">Home</span>
              </button>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
              <UserMenu />
              </div>
            </div>
            {/* Provider badge — bottom-left floating */}
            {(() => {
              const meta = PROVIDER_META[state.provider] ?? { label: state.provider, color: '#6B7280' };
              return (
                <div className="absolute bottom-4 left-3 z-10 flex items-center gap-3 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-4 py-2.5 shadow-lg">
                  <span
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-600" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                      {state.fileName}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {state.data.resources.length} resources{state.iacLabel ? ` \u00B7 ${state.iacLabel}` : ''}
                    </span>
                  </div>
                </div>
              );
            })()}
            {viewMode === 'graph' ? (
              <Canvas
                ref={canvasRef}
                graphNodes={layoutNodes}
                graphEdges={state.data.edges}
                selectedNodeId={state.selectedNodeId}
                searchQuery={searchQuery}
                hiddenTypes={hiddenTypes}
                providerConfig={providerConfig}
                provider={state.data.provider}
                fileName={state.fileName}
                blastRadiusMode={blastRadiusMode}
                costMap={costMap}
                showMinimap={showMinimap}
                onBlastRadiusComputed={setBlastRadiusCount}
                onNodeSelect={(id) =>
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: id } : prev
                  )
                }
              />
            ) : (
              <InventoryTable
                resources={state.data.resources}
                edges={state.data.edges}
                hiddenTypes={hiddenTypes}
                searchQuery={searchQuery}
                providerConfig={providerConfig}
                selectedResourceId={state.selectedNodeId}
                costEstimates={showCosts ? costEstimates : undefined}
                onSelectResource={(id) =>
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: id } : prev
                  )
                }
              />
            )}
            {/* Cost breakdown panel */}
            {showCosts && costEstimates.length > 0 && (
              <CostPanel
                estimates={costEstimates}
                providerConfig={providerConfig}
                onSelectResource={(id) =>
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: id } : prev
                  )
                }
                onClose={() => setShowCosts(false)}
              />
            )}
          </div>
          {showSecurity ? (
            <div className="w-72 xl:w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 pt-16 overflow-y-auto shadow-sm shrink-0 animate-slide-in">
              <SecurityPanel
                resources={state.data.resources}
                edges={state.data.edges}
                providerConfig={providerConfig}
                onSelectResource={(id) => {
                  setShowSecurity(false);
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: id } : prev
                  );
                }}
                onClose={() => setShowSecurity(false)}
              />
            </div>
          ) : showAi ? (
            <div className="w-72 xl:w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 pt-16 overflow-y-auto shadow-sm shrink-0 animate-slide-in">
              <AiChatPanel
                resources={state.data.resources}
                onClose={() => setShowAi(false)}
              />
            </div>
          ) : selectedResource ? (
            <div className="w-72 xl:w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 pt-16 overflow-y-auto shadow-sm shrink-0 animate-slide-in">
              <NodeDetailPanel
                resource={selectedResource}
                edges={state.data.edges}
                resources={state.data.resources}
                providerConfig={providerConfig}
                blastRadiusMode={blastRadiusMode}
                blastRadiusCount={blastRadiusCount}
                onToggleBlastRadius={() => setBlastRadiusMode((v) => !v)}
                onClose={() => {
                  setBlastRadiusMode(false);
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: null } : prev
                  );
                }}
                onSelectResource={(nodeId) =>
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: nodeId } : prev
                  )
                }
              />
            </div>
          ) : null}
        </div>

        {/* Keyboard shortcuts overlay */}
        {showShortcuts && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-3">
                {[
                  { keys: ['⌘', 'K'], desc: 'Focus search' },
                  { keys: ['Esc'], desc: 'Clear search / deselect' },
                  { keys: ['?'], desc: 'Toggle this help' },
                ].map(({ keys, desc }) => (
                  <div key={desc} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{desc}</span>
                    <div className="flex gap-1">
                      {keys.map((k) => (
                        <kbd key={k} className="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">Press <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">?</kbd> or <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">Esc</kbd> to close</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
