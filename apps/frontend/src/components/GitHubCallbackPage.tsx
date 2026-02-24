import { useEffect, useState, useMemo, useRef } from 'react';
import { exchangeGitHubCode } from '@/lib/api';

export function GitHubCallbackPage() {
  const code = useMemo(
    () => new URLSearchParams(window.location.search).get('code'),
    [],
  );

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    code ? 'loading' : 'error',
  );
  const [errorMsg, setErrorMsg] = useState(
    code ? '' : 'No authorization code received from GitHub.',
  );

  // Prevent double-exchange in React 18 StrictMode (codes are single-use)
  const exchanged = useRef(false);

  useEffect(() => {
    if (!code || exchanged.current) return;
    exchanged.current = true;

    exchangeGitHubCode(code).then(
      (result) => {
        // Send token back to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'github-connected',
              token: result.access_token,
              username: result.username,
              avatarUrl: result.avatar_url,
            },
            window.location.origin,
          );
        }
        setStatus('success');
        setTimeout(() => window.close(), 1000);
      },
      (err: unknown) => {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
      },
    );
  }, [code]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <div className="text-center max-w-sm">
        {status === 'loading' && (
          <>
            <div className="h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Connecting to GitHub...
            </p>
          </>
        )}
        {status === 'success' && (
          <>
            <svg className="w-10 h-10 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Connected! This window will close automatically.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <svg className="w-10 h-10 text-red-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{errorMsg}</p>
            <button
              onClick={() => window.close()}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Close this window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
