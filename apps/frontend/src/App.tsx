import { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { HomePage } from '@/components/HomePage';
import { AuthCallback } from '@/components/AuthCallback';

const DocsPage = lazy(() =>
  import('@/components/DocsPage').then((m) => ({ default: m.DocsPage }))
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">
          <svg className="h-16 w-16 mx-auto text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">AI Assistant</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-2">Coming Soon</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">
          AI-powered infrastructure analysis, optimization suggestions, and natural language queries for your Terraform resources.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
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
        <Route path="/api" element={<DocsPage />} />
        <Route path="/ai" element={<ComingSoonPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </Suspense>
  );
}
