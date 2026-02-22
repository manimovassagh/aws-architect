import type { CloudProvider } from '@infragraph/shared';
import { useState } from 'react';
import { Ec2Icon } from './nodes/icons/AwsIcons';
import { AzureVmIcon } from './nodes/icons/AzureIcons';
import { GcpInstanceIcon } from './nodes/icons/GcpIcons';

interface ProviderDef {
  id: CloudProvider;
  name: string;
  description: string;
  color: string;
  count: string;
  icon: React.ComponentType<{ className?: string }>;
}

const providers: ProviderDef[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    description: 'EC2, RDS, S3, Lambda, VPC, Subnets, Load Balancers, and more',
    color: '#FF9900',
    count: '20+',
    icon: Ec2Icon,
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    description: 'VMs, SQL, Storage, Functions, VNets, NSGs, and more',
    color: '#0078D4',
    count: '12+',
    icon: AzureVmIcon,
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    description: 'Compute, Cloud SQL, GCS, Functions, VPCs, and more',
    color: '#4285F4',
    count: '11+',
    icon: GcpInstanceIcon,
  },
];

const steps = [
  { num: '1', label: 'Upload .tfstate' },
  { num: '2', label: 'Auto-detect provider' },
  { num: '3', label: 'Interactive diagram' },
];

interface ProviderSelectProps {
  onSelect: (provider: CloudProvider) => void;
}

export function ProviderSelect({ onSelect }: ProviderSelectProps) {
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
      className={`relative min-h-screen flex flex-col items-center px-6 pt-20 pb-16 ${dark ? 'landing-bg' : 'landing-bg-light'}`}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-10 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
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

      {/* ── Badge ── */}
      <div className="relative z-10 mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Open-source infrastructure visualization
        </span>
      </div>

      {/* ── Hero ── */}
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-gradient text-6xl sm:text-8xl font-extrabold tracking-tight leading-none">
          InfraGraph
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Turn your Terraform state files into beautiful, interactive
          architecture diagrams.{' '}
          <span className="text-slate-700 dark:text-slate-200 font-medium">
            Upload a .tfstate — see your infrastructure in seconds.
          </span>
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="relative z-10 flex items-center gap-6 sm:gap-10 mb-14 text-center">
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">3</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cloud Providers</div>
        </div>
        <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">43+</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Resource Types</div>
        </div>
        <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">0</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Config Needed</div>
        </div>
      </div>

      {/* ── Provider select heading ── */}
      <p className="relative z-10 text-xs font-medium text-slate-400 dark:text-slate-500 mb-5 tracking-widest uppercase">
        Select your cloud provider
      </p>

      {/* ── Provider cards ── */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl w-full mb-16">
        {providers.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="landing-card rounded-2xl p-7 text-left cursor-pointer group"
              style={{ '--glow-color': p.color } as React.CSSProperties}
            >
              {/* Icon + badge */}
              <div className="flex items-start justify-between mb-5">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}0a)` }}
                >
                  <Icon className="h-8 w-8" />
                </div>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide"
                  style={{ backgroundColor: `${p.color}15`, color: p.color }}
                >
                  {p.count} types
                </span>
              </div>

              {/* Name + description */}
              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1.5">
                {p.name}
              </h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                {p.description}
              </p>

              {/* CTA */}
              <div
                className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
                style={{ color: p.color }}
              >
                <span>Get started</span>
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── How it works ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 sm:gap-5 mb-16 text-sm text-slate-500 dark:text-slate-400">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && (
              <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            )}
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 dark:bg-white/10 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {s.num}
            </span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <footer className="absolute bottom-6 z-10 flex items-center gap-2.5 text-xs text-slate-400 dark:text-slate-500">
        <span className="font-mono">v1.3</span>
        <span className="text-slate-300 dark:text-slate-700">&middot;</span>
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Open Source
        </span>
        <span className="text-slate-300 dark:text-slate-700">&middot;</span>
        <a
          href="https://github.com/manimovassagh/aws-architect"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          GitHub
        </a>
        <span className="text-slate-300 dark:text-slate-700">&middot;</span>
        <a
          href="/docs"
          className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Docs
        </a>
      </footer>
    </main>
  );
}
