import { useState, useEffect, useCallback } from 'react';
import type { GitHubRepo, GitHubScanResponse, GitHubTerraformProject, ParseResponse } from '@infragraph/shared';
import { scanGitHubRepo, parseGitHubProject, listGitHubRepos } from '@/lib/api';
import {
  getGitHubToken,
  getGitHubUser,
  setGitHubToken,
  setGitHubUser,
  clearGitHub,
  getGitHubAuthUrl,
  isGitHubOAuthConfigured,
  type GitHubUser,
} from '@/lib/github';

// ─── State machine ──────────────────────────────────────────────────────────

type ModalState =
  | { step: 'connect' }
  | { step: 'loading-repos' }
  | { step: 'repos'; repos: GitHubRepo[] }
  | { step: 'url-input' }
  | { step: 'scanning' }
  | { step: 'pick'; scan: GitHubScanResponse; repoUrl: string }
  | { step: 'parsing'; project: GitHubTerraformProject; repoUrl: string }
  | { step: 'error'; message: string; prev: 'connect' | 'repos' | 'url-input' };

interface GitHubConnectModalProps {
  onClose: () => void;
  onParsed: (data: ParseResponse, fileName: string) => void;
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const GITHUB_ICON =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GitHubConnectModal({ onClose, onParsed }: GitHubConnectModalProps) {
  const existingToken = getGitHubToken();
  const existingUser = getGitHubUser();

  const [ghUser, setGhUser] = useState<GitHubUser | null>(existingUser);
  const [state, setState] = useState<ModalState>(
    existingToken ? { step: 'loading-repos' } : { step: 'connect' },
  );
  const [repoUrl, setRepoUrl] = useState('');
  const [search, setSearch] = useState('');

  // ─── Load repos ────────────────────────────────────────────────────────

  const fetchRepos = useCallback(() => {
    return listGitHubRepos().then(
      (repos) => setState({ step: 'repos', repos }),
      (err: unknown) => setState({
        step: 'error',
        message: err instanceof Error ? err.message : 'Failed to load repos',
        prev: 'repos',
      }),
    );
  }, []);

  const loadRepos = useCallback(() => {
    setState({ step: 'loading-repos' });
    fetchRepos();
  }, [fetchRepos]);

  // On mount: if already connected, fetch repos (state is already 'loading-repos')
  useEffect(() => {
    if (existingToken) fetchRepos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Listen for popup postMessage ─────────────────────────────────────

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'github-connected') return;

      const { token, username, avatarUrl } = event.data as {
        token: string;
        username: string;
        avatarUrl: string;
      };

      setGitHubToken(token);
      setGitHubUser({ username, avatarUrl });
      setGhUser({ username, avatarUrl });
      loadRepos();
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadRepos]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  function handleConnect() {
    const url = getGitHubAuthUrl();
    const w = 500;
    const h = 700;
    const left = window.screenX + (window.innerWidth - w) / 2;
    const top = window.screenY + (window.innerHeight - h) / 2;
    window.open(url, 'github-oauth', `width=${w},height=${h},left=${left},top=${top}`);
  }

  function handleDisconnect() {
    clearGitHub();
    setGhUser(null);
    setState({ step: 'connect' });
  }

  function handleSelectRepo(repo: GitHubRepo) {
    const url = repo.html_url;
    setRepoUrl(url);
    setState({ step: 'scanning' });
    scanGitHubRepo(url).then(
      (scan) => setState({ step: 'pick', scan, repoUrl: url }),
      (err: unknown) => setState({
        step: 'error',
        message: err instanceof Error ? err.message : 'Failed to scan',
        prev: 'repos',
      }),
    );
  }

  function handleUrlScan() {
    const url = repoUrl.trim();
    if (!url) return;
    setState({ step: 'scanning' });
    scanGitHubRepo(url).then(
      (scan) => setState({ step: 'pick', scan, repoUrl: url }),
      (err: unknown) => setState({
        step: 'error',
        message: err instanceof Error ? err.message : 'Failed to scan',
        prev: 'url-input',
      }),
    );
  }

  function handleSelectProject(project: GitHubTerraformProject, url: string) {
    setState({ step: 'parsing', project, repoUrl: url });
    parseGitHubProject(url, project.path).then(
      (data) => {
        const fileName = `${project.path} (GitHub)`;
        onParsed(data, fileName);
      },
      (err: unknown) => setState({
        step: 'error',
        message: err instanceof Error ? err.message : 'Failed to parse',
        prev: 'repos',
      }),
    );
  }

  function handleBack() {
    if (ghUser) {
      loadRepos();
    } else {
      setState({ step: 'connect' });
    }
  }

  // ─── Filtered repos ───────────────────────────────────────────────────

  const filteredRepos =
    state.step === 'repos'
      ? state.repos.filter(
          (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            (r.description ?? '').toLowerCase().includes(search.toLowerCase()),
        )
      : [];

  // ─── Render ───────────────────────────────────────────────────────────

  const oauthConfigured = isGitHubOAuthConfigured();
  const isConnected = !!ghUser;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            {(state.step === 'pick' || state.step === 'parsing') && (
              <button onClick={handleBack} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="currentColor" viewBox="0 0 16 16">
              <path d={GITHUB_ICON} />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Connect GitHub Repo</h2>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <div className="flex items-center gap-2 mr-2">
                <img src={ghUser.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                <span className="text-xs text-slate-500 dark:text-slate-400">{ghUser.username}</span>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Disconnect
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="px-6 py-5">

          {/* Phase 1: Not connected — OAuth button + URL fallback */}
          {state.step === 'connect' && (
            <div className="space-y-4">
              {oauthConfigured && (
                <button
                  onClick={handleConnect}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 dark:bg-slate-600 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d={GITHUB_ICON} />
                  </svg>
                  Connect to GitHub
                </button>
              )}

              {oauthConfigured && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400 dark:text-slate-500">or enter a URL</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlScan()}
                  placeholder="https://github.com/owner/repo"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleUrlScan}
                  disabled={!repoUrl.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-800 dark:bg-slate-600 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  Scan
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Connected — repo browser */}
          {state.step === 'repos' && (
            <div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
              {filteredRepos.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                  {search ? 'No matching repositories' : 'No repositories found'}
                </p>
              ) : (
                <ul className="space-y-1 max-h-72 overflow-y-auto">
                  {filteredRepos.map((repo) => (
                    <li key={repo.full_name}>
                      <button
                        onClick={() => handleSelectRepo(repo)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                              {repo.name}
                            </span>
                            {repo.private && (
                              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {repo.description}
                            </p>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 shrink-0 ml-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* URL fallback for connected users */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlScan()}
                    placeholder="Or enter a repo URL..."
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleUrlScan}
                    disabled={!repoUrl.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800 dark:bg-slate-600 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    Scan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* URL input fallback (standalone, when navigated here) */}
          {state.step === 'url-input' && (
            <div className="flex gap-2">
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlScan()}
                placeholder="https://github.com/owner/repo"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleUrlScan}
                disabled={!repoUrl.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 dark:bg-slate-600 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Scan
              </button>
            </div>
          )}

          {/* Loading repos spinner */}
          {state.step === 'loading-repos' && (
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 py-4">
              <Spinner />
              Loading your repositories...
            </div>
          )}

          {/* Scanning spinner */}
          {state.step === 'scanning' && (
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 py-4">
              <Spinner />
              Scanning repository for Terraform projects...
            </div>
          )}

          {/* Phase 3: Project picker */}
          {state.step === 'pick' && (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Found <span className="font-semibold text-slate-700 dark:text-slate-200">{state.scan.projects.length}</span> Terraform project{state.scan.projects.length !== 1 && 's'}:
              </p>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {state.scan.projects.map((project) => (
                  <li key={project.path}>
                    <button
                      onClick={() => handleSelectProject(project, state.repoUrl)}
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
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 py-4">
              <Spinner />
              Parsing {state.project.path}...
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">{state.message}</p>
                <button
                  onClick={() => {
                    if (state.prev === 'repos') loadRepos();
                    else if (state.prev === 'url-input') setState({ step: 'url-input' });
                    else setState({ step: 'connect' });
                  }}
                  className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isConnected
              ? 'Connected to GitHub. Private repos accessible.'
              : oauthConfigured
                ? 'Connect to GitHub for private repos, or enter a public repo URL.'
                : 'Public repositories only. Scans for directories containing .tf files.'}
          </p>
        </div>
      </div>
    </div>
  );
}
