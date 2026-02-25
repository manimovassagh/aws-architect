import { useEffect, useRef, useState } from 'react';
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
import { parseFile, parseHcl, parseCfn, saveSession } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { UserMenu } from '@/components/UserMenu';

const PROVIDER_META: Record<string, { label: string; color: string }> = {
  aws: { label: 'AWS', color: '#FF9900' },
  azure: { label: 'Azure', color: '#0078D4' },
  gcp: { label: 'GCP', color: '#4285F4' },
};

const IAC_SOURCE_LABELS: Record<string, string> = {
  'terraform-state': 'Terraform State',
  'terraform-hcl': 'Terraform HCL',
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
  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  const [providerConfig, setProviderConfig] = useState<ProviderFrontendConfig | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
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

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
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

  async function handleSmartUpload(files: File[], mode: 'tfstate' | 'hcl' | 'cfn' | 'cdk') {
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
          if (obj?.AWSTemplateFormatVersion || (obj?.Resources && typeof obj.Resources === 'object')) {
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
              <div className="flex items-center gap-1 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm min-w-0 overflow-x-auto">
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
              <button
                onClick={() => canvasRef.current?.exportPng()}
                className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                title="Export canvas as PNG"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                PNG
              </button>
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
                New file
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
                Home
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
            <Canvas
              ref={canvasRef}
              graphNodes={state.data.nodes}
              graphEdges={state.data.edges}
              selectedNodeId={state.selectedNodeId}
              searchQuery={searchQuery}
              hiddenTypes={hiddenTypes}
              providerConfig={providerConfig}
              onNodeSelect={(id) =>
                setState((prev) =>
                  prev.view === 'canvas' ? { ...prev, selectedNodeId: id } : prev
                )
              }
            />
          </div>
          {selectedResource && (
            <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 overflow-y-auto shadow-sm shrink-0 animate-slide-in">
              <NodeDetailPanel
                resource={selectedResource}
                edges={state.data.edges}
                resources={state.data.resources}
                providerConfig={providerConfig}
                onClose={() =>
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: null } : prev
                  )
                }
                onSelectResource={(nodeId) =>
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: nodeId } : prev
                  )
                }
              />
            </div>
          )}
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
