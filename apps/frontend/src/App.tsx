import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/components/HomePage';
import { AuthCallback } from '@/components/AuthCallback';
import { GitHubCallbackPage } from '@/components/GitHubCallbackPage';

const DocsPage = lazy(() =>
  import('@/components/DocsPage').then((m) => ({ default: m.DocsPage }))
);

const HistoryPage = lazy(() =>
  import('@/components/HistoryPage').then((m) => ({ default: m.HistoryPage }))
);

const AiPage = lazy(() =>
  import('@/components/AiPage').then((m) => ({ default: m.AiPage }))
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/canvas" element={<HomePage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/reference" element={<DocsPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/github-callback" element={<GitHubCallbackPage />} />
      </Routes>
    </Suspense>
  );
}
