import { useEffect, useRef, useState } from 'react';
import type { AiChatMessage, AiStatusResponse, CloudResource } from '@infragraph/shared';
import { getAiStatus, sendAiChat } from '@/lib/api';

interface Props {
  resources?: CloudResource[];
  onClose?: () => void;
}

export function AiChatPanel({ resources, onClose }: Props) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Probe Ollama status on mount
  useEffect(() => {
    let cancelled = false;
    setStatusLoading(true);
    getAiStatus()
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus({ available: false, model: 'tinyllama', modelLoaded: false, error: 'Could not reach backend' }); })
      .finally(() => { if (!cancelled) setStatusLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: AiChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const result = await sendAiChat({
        messages: [...messages, userMessage],
        resources,
      });
      setMessages((prev) => [...prev, result.message]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const isOffline = status && !status.available;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI Assistant</h2>
          {resources && resources.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
              {resources.length} resources
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close panel">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status bar */}
      {!statusLoading && status && (
        <div className={`text-[10px] px-2 py-1 rounded mb-2 ${
          status.available
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
        }`}>
          {status.available
            ? `Connected — ${status.model}${status.modelLoaded ? '' : ' (pulling...)'}`
            : `Ollama offline${status.error ? ` — ${status.error}` : ''}`
          }
        </div>
      )}

      {/* Offline callout */}
      {isOffline && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <svg className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Ollama not running</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
            Start Ollama locally or run <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px]">docker compose up</code> to enable AI features.
          </p>
          <button
            onClick={() => {
              setStatusLoading(true);
              getAiStatus()
                .then(setStatus)
                .catch(() => setStatus({ available: false, model: 'tinyllama', modelLoaded: false, error: 'Could not reach backend' }))
                .finally(() => setStatusLoading(false));
            }}
            className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            Retry connection
          </button>
        </div>
      )}

      {/* Messages */}
      {!isOffline && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-4 px-4 space-y-3 mb-3">
            {messages.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {resources && resources.length > 0
                    ? 'Ask about your infrastructure — security, costs, architecture...'
                    : 'Ask any cloud infrastructure question.'}
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-pulse text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-[10px] text-red-600 dark:text-red-400 mb-2 px-1">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={statusLoading ? 'Connecting...' : 'Ask a question...'}
              disabled={loading || statusLoading}
              className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || statusLoading}
              className="rounded-lg bg-violet-600 px-3 py-2 text-white text-xs hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
