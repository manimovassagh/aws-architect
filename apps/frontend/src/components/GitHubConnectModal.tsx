import { useState } from 'react';
import type { GitHubScanResponse, GitHubTerraformProject, ParseResponse } from '@infragraph/shared';
import { scanGitHubRepo, parseGitHubProject } from '@/lib/api';

type ModalState =
  | { step: 'input' }
  | { step: 'scanning' }
  | { step: 'pick'; scan: GitHubScanResponse }
  | { step: 'parsing'; project: GitHubTerraformProject }
  | { step: 'error'; message: string };

interface GitHubConnectModalProps {
  onClose: () => void;
  onParsed: (data: ParseResponse, fileName: string) => void;
}

const GITHUB_ICON =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

export function GitHubConnectModal({ onClose, onParsed }: GitHubConnectModalProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [state, setState] = useState<ModalState>({ step: 'input' });

  async function handleScan() {
    const url = repoUrl.trim();
    if (!url) return;
    setState({ step: 'scanning' });
    try {
      const scan = await scanGitHubRepo(url);
      setState({ step: 'pick', scan });
    } catch (err) {
      setState({ step: 'error', message: err instanceof Error ? err.message : 'Failed to scan' });
    }
  }

  async function handleSelectProject(project: GitHubTerraformProject) {
    setState({ step: 'parsing', project });
    try {
      const data = await parseGitHubProject(repoUrl.trim(), project.path);
      const fileName = `${project.path} (GitHub)`;
      onParsed(data, fileName);
    } catch (err) {
      setState({ step: 'error', message: err instanceof Error ? err.message : 'Failed to parse' });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="currentColor" viewBox="0 0 16 16">
              <path d={GITHUB_ICON} />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Connect GitHub Repo</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* URL input — always visible */}
          <div className="flex gap-2">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              placeholder="https://github.com/owner/repo"
              disabled={state.step === 'scanning' || state.step === 'parsing'}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleScan}
              disabled={!repoUrl.trim() || state.step === 'scanning' || state.step === 'parsing'}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 dark:bg-slate-600 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {state.step === 'scanning' ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          {/* Scanning spinner */}
          {state.step === 'scanning' && (
            <div className="flex items-center gap-3 mt-5 text-sm text-slate-500 dark:text-slate-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning repository for Terraform projects...
            </div>
          )}

          {/* Project list */}
          {state.step === 'pick' && (
            <div className="mt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Found <span className="font-semibold text-slate-700 dark:text-slate-200">{state.scan.projects.length}</span> Terraform project{state.scan.projects.length !== 1 && 's'}:
              </p>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {state.scan.projects.map((project) => (
                  <li key={project.path}>
                    <button
                      onClick={() => handleSelectProject(project)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {project.path === '.' ? '(root)' : project.path}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                        {project.files.length} .tf file{project.files.length !== 1 && 's'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsing spinner */}
          {state.step === 'parsing' && (
            <div className="flex items-center gap-3 mt-5 text-sm text-slate-500 dark:text-slate-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Parsing {state.project.path}...
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">{state.message}</p>
                <button
                  onClick={() => setState({ step: 'input' })}
                  className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Public repositories only. Scans for directories containing .tf files.
          </p>
        </div>
      </div>
    </div>
  );
}
