import { useEffect, useRef, useState } from 'react';
import type { CloudProvider, ParseResponse } from '@infragraph/shared';
import type { ProviderFrontendConfig } from '@/providers/types';
import { getProviderFrontendConfig } from '@/providers';
import { ProviderSelect } from '@/components/ProviderSelect';
import { Upload, type UploadMode } from '@/components/Upload';
import { Canvas, type CanvasHandle } from '@/components/Canvas';
import { NodeDetailPanel } from '@/components/NodeDetailPanel';
import { ResourceSummary } from '@/components/ResourceSummary';
import { SearchBar, type SearchBarHandle } from '@/components/SearchBar';
import { parseFile, parseHcl } from '@/lib/api';

type AppState =
  | { view: 'provider-select' }
  | { view: 'upload'; provider: CloudProvider }
  | { view: 'loading'; provider: CloudProvider }
  | { view: 'error'; provider: CloudProvider; message: string; fileName?: string }
  | { view: 'canvas'; provider: CloudProvider; data: ParseResponse; selectedNodeId: string | null; fileName: string };

export default function App() {
  const [state, setState] = useState<AppState>({ view: 'provider-select' });
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [uploadMode, setUploadMode] = useState<UploadMode>('tfstate');
  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  const [providerConfig, setProviderConfig] = useState<ProviderFrontendConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<SearchBarHandle>(null);
  const canvasRef = useRef<CanvasHandle>(null);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchBarRef.current?.focus();
      }
      if (e.key === 'Escape') {
        searchBarRef.current?.clear();
        setSearchQuery('');
        setState((prev) =>
          prev.view === 'canvas' ? { ...prev, selectedNodeId: null } : prev
        );
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleProviderSelect(provider: CloudProvider) {
    const config = await getProviderFrontendConfig(provider);
    setProviderConfig(config);
    setState({ view: 'upload', provider });
  }

  async function handleFileAccepted(file: File) {
    if (state.view !== 'upload' && state.view !== 'canvas' && state.view !== 'error') return;
    const provider = state.provider;
    setState({ view: 'loading', provider });
    try {
      const data = await parseFile(file, provider);
      if (data.resources.length === 0) {
        setState({ view: 'error', provider, message: 'No resources found in this file. Make sure it contains managed Terraform resources.', fileName: file.name });
        return;
      }
      // Load provider config based on what backend detected
      const config = await getProviderFrontendConfig(data.provider);
      setProviderConfig(config);
      setState({ view: 'canvas', provider: data.provider, data, selectedNodeId: null, fileName: file.name });
    } catch (err) {
      setState({ view: 'error', provider, message: err instanceof Error ? err.message : 'Unknown error', fileName: file.name });
    }
  }

  async function handleFilesAccepted(files: File[]) {
    if (state.view !== 'upload' && state.view !== 'canvas' && state.view !== 'error') return;
    const provider = state.provider;
    setState({ view: 'loading', provider });
    try {
      const data = await parseHcl(files, provider);
      if (data.resources.length === 0) {
        setState({ view: 'error', provider, message: 'No resources found in the .tf files.', fileName: `${files.length} file(s)` });
        return;
      }
      const config = await getProviderFrontendConfig(data.provider);
      setProviderConfig(config);
      const label = files.length === 1 ? files[0]!.name : `${files.length} .tf files`;
      setState({ view: 'canvas', provider: data.provider, data, selectedNodeId: null, fileName: label });
    } catch (err) {
      setState({ view: 'error', provider, message: err instanceof Error ? err.message : 'Unknown error', fileName: `${files.length} file(s)` });
    }
  }

  function handleNewUpload() {
    setProviderConfig(null);
    setState({ view: 'provider-select' });
  }

  function handleQuickUpload() {
    fileInputRef.current?.click();
  }

  function onQuickFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileAccepted(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Provider select view
  if (state.view === 'provider-select') {
    return <ProviderSelect onSelect={handleProviderSelect} />;
  }

  if (state.view === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-[#ED7100] rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Parsing infrastructure...</p>
        </div>
      </main>
    );
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
          accept=".tfstate,.json"
          onChange={onQuickFileChange}
          className="hidden"
        />

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative">
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
            />
            <SearchBar ref={searchBarRef} onSearch={setSearchQuery} />
            {/* Toolbar */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
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
                onClick={handleNewUpload}
                className="flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
                title="Return to provider selection"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                Home
              </button>
            </div>
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
          <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 overflow-y-auto shadow-sm shrink-0">
            {selectedResource ? (
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
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg className="h-12 w-12 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <p className="text-sm text-slate-400">Click a node to inspect it</p>
                <p className="text-xs text-slate-300 mt-1">View attributes, tags, and connections</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  async function handleTrySample() {
    if (state.view !== 'upload') return;
    const provider = state.provider;
    setState({ view: 'loading', provider });
    try {
      const res = await fetch('/sample.tfstate');
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/json' });
      const file = new File([blob], 'sample.tfstate');
      const data = await parseFile(file, provider);
      const config = await getProviderFrontendConfig(data.provider);
      setProviderConfig(config);
      setState({ view: 'canvas', provider: data.provider, data, selectedNodeId: null, fileName: 'sample.tfstate' });
    } catch (err) {
      setState({ view: 'error', provider, message: err instanceof Error ? err.message : 'Failed to load sample' });
    }
  }

  // Default: upload view
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">InfraGraph</h1>
      <p className="text-slate-500 text-sm">Upload your {state.view === 'upload' ? state.provider.toUpperCase() : ''} Terraform files</p>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setUploadMode('tfstate')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            uploadMode === 'tfstate'
              ? 'bg-[#ED7100] text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          .tfstate (deployed)
        </button>
        <button
          onClick={() => setUploadMode('hcl')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            uploadMode === 'hcl'
              ? 'bg-[#ED7100] text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          .tf source files
        </button>
      </div>

      <div className="w-full max-w-lg">
        <Upload
          mode={uploadMode}
          onFileAccepted={handleFileAccepted}
          onFilesAccepted={handleFilesAccepted}
        />
      </div>

      <div className="flex items-center gap-4">
        {uploadMode === 'tfstate' && (
          <button
            onClick={handleTrySample}
            className="text-xs text-slate-400 hover:text-[#ED7100] transition-colors underline underline-offset-2"
          >
            Try with sample infrastructure
          </button>
        )}
        <button
          onClick={handleNewUpload}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
        >
          Change provider
        </button>
      </div>
    </main>
  );
}
