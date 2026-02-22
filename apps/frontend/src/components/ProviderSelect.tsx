import type { CloudProvider } from '@infragraph/shared';
import { useState } from 'react';
import { Ec2Icon } from './nodes/icons/AwsIcons';
import { AzureVmIcon } from './nodes/icons/AzureIcons';
import { GcpInstanceIcon } from './nodes/icons/GcpIcons';
import { Upload } from './Upload';

interface ProviderDef {
  id: CloudProvider;
  name: string;
  shortName: string;
  description: string;
  color: string;
  count: string;
  icon: React.ComponentType<{ className?: string }>;
}

const providers: ProviderDef[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    description: 'EC2, RDS, S3, Lambda, VPC, Subnets, Load Balancers, and more',
    color: '#FF9900',
    count: '20+',
    icon: Ec2Icon,
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    description: 'VMs, SQL, Storage, Functions, VNets, NSGs, and more',
    color: '#0078D4',
    count: '12+',
    icon: AzureVmIcon,
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    description: 'Compute, Cloud SQL, GCS, Functions, VPCs, and more',
    color: '#4285F4',
    count: '11+',
    icon: GcpInstanceIcon,
  },
];

interface ProviderSelectProps {
  onUpload: (files: File[], mode: 'tfstate' | 'hcl') => void;
  onTrySample: (provider: CloudProvider) => void;
}

export function ProviderSelect({ onUpload, onTrySample }: ProviderSelectProps) {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <main
      className={`relative min-h-screen flex flex-col items-center justify-center px-6 py-8 ${dark ? 'landing-bg' : 'landing-bg-light'}`}
    >
      {/* ── Top nav bar ── */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-end px-6 py-4">
        <div className="flex items-center gap-1">
          {[
            { label: 'Docs', href: '/docs' },
            { label: 'API', href: '/api' },
            { label: 'AI', href: '/ai' },
          ].map((tab) => (
            <a
              key={tab.label}
              href={tab.href}
              className="px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {tab.label}
            </a>
          ))}
          <div className="w-px h-5 bg-slate-300 dark:bg-white/15 mx-1.5" />
          <a
            href="https://github.com/manimovassagh/aws-architect"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors ml-1"
            aria-label="Toggle theme"
          >
            {dark ? (
              <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative z-10 text-center mb-5">
        <h1 className="text-gradient text-5xl sm:text-7xl font-extrabold tracking-tight leading-none">
          InfraGraph
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Turn Terraform files into interactive architecture diagrams.{' '}
          <span className="text-slate-700 dark:text-slate-200 font-medium">
            Drop any file — everything is auto-detected.
          </span>
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="relative z-10 flex items-center gap-5 sm:gap-8 mb-5 text-center">
        <div>
          <div className="text-xl font-bold text-slate-800 dark:text-white">3</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Providers</div>
        </div>
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
        <div>
          <div className="text-xl font-bold text-slate-800 dark:text-white">43+</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Resources</div>
        </div>
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
        <div>
          <div className="text-xl font-bold text-slate-800 dark:text-white">0</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Config</div>
        </div>
      </div>

      {/* ── Upload area (primary CTA) ── */}
      <div className="relative z-10 w-full max-w-xl mb-4">
        <Upload onSubmit={onUpload} />
      </div>

      {/* ── Try sample links ── */}
      <div className="relative z-10 flex items-center gap-3 mb-8 text-xs">
        <span className="text-slate-400 dark:text-slate-500">Try a sample:</span>
        {providers.map((p, i) => (
          <span key={p.id} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300 dark:text-slate-600">&middot;</span>}
            <button
              onClick={() => onTrySample(p.id)}
              className="font-medium hover:underline underline-offset-2 transition-colors"
              style={{ color: p.color }}
            >
              {p.name}
            </button>
          </span>
        ))}
      </div>

      {/* ── Preview screenshot ── */}
      <div className="relative z-10 w-full max-w-3xl mb-6">
        <div className="rounded-xl overflow-hidden shadow-lg ring-1 ring-slate-200 dark:ring-white/10">
          <img
            src="/preview-graph.png"
            alt="Example architecture diagram generated by InfraGraph"
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      </div>

      {/* ── Provider cards (compact, informational) ── */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl w-full mb-6">
        {providers.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className="landing-card rounded-xl px-5 py-4 text-left group"
              style={{ '--glow-color': p.color } as React.CSSProperties}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}0a)` }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">
                    {p.shortName}
                  </h3>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide shrink-0"
                  style={{ backgroundColor: `${p.color}15`, color: p.color }}
                >
                  {p.count}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-snug">
                {p.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <footer className="relative z-10 flex items-center gap-2.5 text-xs text-slate-400 dark:text-slate-500">
        <span className="font-mono">v2.0</span>
        <span className="text-slate-300 dark:text-slate-700">&middot;</span>
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Open Source
        </span>
      </footer>
    </main>
  );
}
