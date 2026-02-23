import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SessionSummary } from '@infragraph/shared';
import { useAuth } from '@/lib/AuthContext';
import { listSessions, getSession, deleteSession } from '@/lib/api';
import { UserMenu } from './UserMenu';

const GITHUB_PATH =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

const providerColors: Record<string, string> = {
  aws: '#FF9900',
  azure: '#0078D4',
  gcp: '#4285F4',
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    async function fetchSessions() {
      try {
        const data = await listSessions();
        setSessions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [user, authLoading]);

  async function handleLoad(id: string) {
    try {
      const session = await getSession(id);
      sessionStorage.setItem('loadSession', JSON.stringify({
        provider: session.provider,
        fileName: session.fileName,
        data: session.data,
      }));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  return (
    <div className={`min-h-screen ${dark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-1">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight mr-6 hover:opacity-80 transition-opacity"
          >
            InfraGraph
          </Link>
          {['Docs', 'API', 'AI'].map((label) => (
            <Link
              key={label}
              to={`/${label.toLowerCase()}`}
              className="px-3 py-2 text-sm font-medium rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <a
            href="https://github.com/manimovassagh/aws-architect"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d={GITHUB_PATH} />
            </svg>
            GitHub
          </a>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? (
              <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
          <UserMenu />
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Your previously parsed infrastructure diagrams.
          </p>
        </div>

        {/* Not logged in */}
        {!authLoading && !user && (
          <div className="text-center py-16">
            <svg className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              Sign in to save and view your session history.
            </p>
            <Link
              to="/"
              className="inline-flex items-center mt-4 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>
        )}

        {/* Loading */}
        {(authLoading || loading) && user && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !authLoading && user && sessions.length === 0 && !error && (
          <div className="text-center py-16">
            <svg className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">No sessions yet.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Upload a Terraform file to create your first session.
            </p>
            <Link
              to="/"
              className="inline-flex items-center mt-4 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              Upload a file
            </Link>
          </div>
        )}

        {/* Session list */}
        {sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Provider badge */}
                <span
                  className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: providerColors[s.provider] ?? '#6B7280' }}
                >
                  {s.provider}
                </span>

                {/* File info */}
                <button
                  onClick={() => handleLoad(s.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {s.fileName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.resourceCount} resources &middot; {relativeDate(s.createdAt)}
                  </p>
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(s.id)}
                  className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Delete session"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
