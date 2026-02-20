'use client';

import { useRef, useState } from 'react';
import type { ParseResponse } from '@awsarchitect/shared';
import { Upload, type UploadMode } from '@/components/Upload';
import { Canvas } from '@/components/Canvas';
import { NodeDetailPanel } from '@/components/NodeDetailPanel';
import { ResourceSummary } from '@/components/ResourceSummary';
import { SearchBar } from '@/components/SearchBar';
import { parseFile, parseHcl } from '@/lib/api';

type AppState =
  | { view: 'upload' }
  | { view: 'loading' }
  | { view: 'error'; message: string; fileName?: string }
  | { view: 'canvas'; data: ParseResponse; selectedNodeId: string | null; fileName: string };

export default function Home() {
  const [state, setState] = useState<AppState>({ view: 'upload' });
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadMode, setUploadMode] = useState<UploadMode>('tfstate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileAccepted(file: File) {
    setState({ view: 'loading' });
    try {
      const data = await parseFile(file);
      if (data.resources.length === 0) {
        setState({ view: 'error', message: 'No AWS resources found in this file. Make sure it contains managed Terraform resources.', fileName: file.name });
        return;
      }
      setState({ view: 'canvas', data, selectedNodeId: null, fileName: file.name });
    } catch (err) {
      setState({ view: 'error', message: err instanceof Error ? err.message : 'Unknown error', fileName: file.name });
    }
  }

  async function handleFilesAccepted(files: File[]) {
    setState({ view: 'loading' });
    try {
      const data = await parseHcl(files);
      if (data.resources.length === 0) {
        setState({ view: 'error', message: 'No AWS resources found in the .tf files.', fileName: `${files.length} file(s)` });
        return;
      }
      const label = files.length === 1 ? files[0]!.name : `${files.length} .tf files`;
      setState({ view: 'canvas', data, selectedNodeId: null, fileName: label });
    } catch (err) {
      setState({ view: 'error', message: err instanceof Error ? err.message : 'Unknown error', fileName: `${files.length} file(s)` });
    }
  }

  function handleNewUpload() {
    setState({ view: 'upload' });
  }

  // Reupload via hidden input (used from canvas header)
  function handleQuickUpload() {
    fileInputRef.current?.click();
  }

  function onQuickFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileAccepted(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  if (state.view === 'canvas') {
    const selectedResource = state.selectedNodeId
      ? state.data.resources.find((r) => r.id === state.selectedNodeId)
      : null;

    return (
      <div className="flex flex-col h-screen">
        {/* Hidden file input for quick re-upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".tfstate,.json"
          onChange={onQuickFileChange}
          className="hidden"
        />

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative">
            <ResourceSummary resources={state.data.resources} />
            <SearchBar onSearch={setSearchQuery} />
            {/* Upload new file button */}
            <button
              onClick={handleQuickUpload}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 shadow-sm text-xs text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
              title="Upload a different file"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              New file
            </button>
            <Canvas
              graphNodes={state.data.nodes}
              graphEdges={state.data.edges}
              selectedNodeId={state.selectedNodeId}
              searchQuery={searchQuery}
              onNodeSelect={(id) =>
                setState((prev) =>
                  prev.view === 'canvas' ? { ...prev, selectedNodeId: id } : prev
                )
              }
            />
          </div>
          <div className="w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto shadow-sm shrink-0">
            {selectedResource ? (
              <NodeDetailPanel
                resource={selectedResource}
                edges={state.data.edges}
                resources={state.data.resources}
                onClose={() =>
                  setState((prev) =>
                    prev.view === 'canvas' ? { ...prev, selectedNodeId: null } : prev
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
    setState({ view: 'loading' });
    try {
      const res = await fetch('/sample.tfstate');
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/json' });
      const file = new File([blob], 'sample.tfstate');
      const data = await parseFile(file);
      setState({ view: 'canvas', data, selectedNodeId: null, fileName: 'sample.tfstate' });
    } catch (err) {
      setState({ view: 'error', message: err instanceof Error ? err.message : 'Failed to load sample' });
    }
  }

  // Default: upload view
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">AWSArchitect</h1>
      <p className="text-slate-500 text-sm">Visualize your Terraform infrastructure</p>

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

      {uploadMode === 'tfstate' && (
        <button
          onClick={handleTrySample}
          className="text-xs text-slate-400 hover:text-[#ED7100] transition-colors underline underline-offset-2"
        >
          Try with sample infrastructure
        </button>
      )}
    </main>
  );
}
