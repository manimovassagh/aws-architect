'use client';

import { useState } from 'react';
import type { ParseResponse } from '@awsarchitect/shared';
import { Upload } from '@/components/Upload';
import { Canvas } from '@/components/Canvas';
import { parseFile } from '@/lib/api';

type AppState =
  | { view: 'upload' }
  | { view: 'loading' }
  | { view: 'error'; message: string }
  | { view: 'canvas'; data: ParseResponse; selectedNodeId: string | null };

export default function Home() {
  const [state, setState] = useState<AppState>({ view: 'upload' });

  async function handleFileAccepted(file: File) {
    setState({ view: 'loading' });
    try {
      const data = await parseFile(file);
      setState({ view: 'canvas', data, selectedNodeId: null });
    } catch (err) {
      setState({ view: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  if (state.view === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400 animate-pulse">Parsing infrastructure...</p>
      </main>
    );
  }

  if (state.view === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-400">{state.message}</p>
        <button
          onClick={() => setState({ view: 'upload' })}
          className="px-4 py-2 text-sm rounded-md border border-slate-600 text-slate-300 hover:bg-navy-700 transition-colors"
        >
          Try again
        </button>
      </main>
    );
  }

  if (state.view === 'canvas') {
    return (
      <div className="flex h-screen">
        <div className="flex-1">
          <Canvas
            graphNodes={state.data.nodes}
            graphEdges={state.data.edges}
            onNodeSelect={(id) =>
              setState((prev) =>
                prev.view === 'canvas' ? { ...prev, selectedNodeId: id } : prev
              )
            }
          />
        </div>
        {/* Sidebar placeholder — Step 6 */}
        <div className="w-80 border-l border-slate-700 bg-navy-800 p-4 overflow-y-auto">
          {state.selectedNodeId ? (
            <div>
              <p className="text-sm text-slate-400">Selected:</p>
              <p className="text-slate-200 font-medium">{state.selectedNodeId}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Click a node to inspect it</p>
          )}
        </div>
      </div>
    );
  }

  // Default: upload view
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">AWSArchitect</h1>
      <p className="text-slate-400 text-sm">Upload a Terraform state file to visualize your infrastructure</p>
      <div className="w-full max-w-lg">
        <Upload onFileAccepted={handleFileAccepted} />
      </div>
    </main>
  );
}
