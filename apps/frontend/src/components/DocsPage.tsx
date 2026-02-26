import { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserMenu } from './UserMenu';

const GITHUB_PATH =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

type Section = 'overview' | 'quickstart' | 'github' | 'providers' | 'api' | 'keyboard';

const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'github', label: 'GitHub Integration' },
  { id: 'providers', label: 'Providers' },
  { id: 'api', label: 'API Reference' },
  { id: 'keyboard', label: 'Keyboard Shortcuts' },
];

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed">
      {lang && (
        <span className="text-slate-500 text-xs block mb-2">{lang}</span>
      )}
      <code>{children}</code>
    </pre>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {children}
    </span>
  );
}

const pathToSection: Record<string, Section> = {
  '/docs': 'overview',
  '/reference': 'api',
  '/ai': 'overview',
};

interface SearchEntry {
  section: Section;
  title: string;
  text: string;
}

const searchIndex: SearchEntry[] = [
  // Overview
  { section: 'overview', title: 'What is InfraGraph?', text: 'InfraGraph is an open-source infrastructure visualization platform that transforms Terraform, CloudFormation, and CDK code into interactive architecture diagrams. Multi-cloud support for AWS Azure GCP. Connect GitHub repos, upload files, or call the API.' },
  { section: 'overview', title: 'Use Cases', text: 'Architecture reviews, onboarding, compliance audits, CI/CD pipeline integration, documentation generation, infrastructure drift detection, team collaboration.' },
  { section: 'overview', title: 'Features', text: 'Multi-IaC support Terraform CloudFormation CDK, multi-cloud auto-detection, nested container layout VPC Subnet, GitHub repo scanning, private repo access, session history, export PNG SVG, search filter resources, dark mode.' },
  // Quick Start
  { section: 'quickstart', title: 'Upload your IaC file', text: 'Drop a .tfstate, .tf, .yaml, .json, or .template file onto the upload zone, or click to browse. InfraGraph auto-detects the cloud provider and IaC tool. Supported formats: Terraform state files, HCL configuration files, CloudFormation templates, CDK-synthesized templates.' },
  { section: 'quickstart', title: 'Parse and visualize', text: 'Click Parse to send the file to the backend. InfraGraph extracts resources, resolves relationships and dependencies, and builds a nested graph with VPCs, subnets laid out automatically.' },
  { section: 'quickstart', title: 'Explore your infrastructure', text: 'Click a node to inspect attributes tags connections. Search resources with Cmd+K. Filter by resource type. Export diagram as PNG.' },
  // GitHub Integration
  { section: 'github', title: 'Connect to GitHub', text: 'One-click OAuth connection to browse your repositories. Access private repos, scan for IaC projects, parse directly from GitHub without downloading files.' },
  { section: 'github', title: 'Repo Browser', text: 'Search and browse your GitHub repositories. Private repos shown with lock icon. Click to scan for IaC projects. Select a project to visualize.' },
  { section: 'github', title: 'Public Repo URL', text: 'Paste any public GitHub repo URL to scan for IaC projects without authentication. Works with any public repository containing .tf files.' },
  // Providers
  { section: 'providers', title: 'AWS Provider', text: 'AWS VPC Subnet EC2 Instance RDS S3 Bucket Lambda Function Load Balancer Security Group Internet Gateway NAT Gateway ECS EKS CloudFront DynamoDB SNS SQS Route53 IAM' },
  { section: 'providers', title: 'Azure Provider', text: 'Azure Virtual Network Subnet Virtual Machine SQL Database Storage Account Function App Load Balancer Public IP Network Security Group AKS App Service' },
  { section: 'providers', title: 'GCP Provider', text: 'GCP VPC Network Subnetwork Compute Instance Cloud SQL Cloud Storage Cloud Function Forwarding Rule Firewall GKE Pub/Sub Cloud Run' },
  { section: 'providers', title: 'Container Nesting', text: 'Resources nested inside parent containers. AWS: Subnets inside VPCs. Azure: Subnets inside Virtual Networks. GCP: Subnetworks inside VPC Networks.' },
  // API Reference
  { section: 'api', title: 'POST /api/parse', text: 'Parse a .tfstate file upload via multipart form and return architecture graph data with nodes edges resources.' },
  { section: 'api', title: 'POST /api/parse/raw', text: 'Parse raw tfstate JSON string from request body. Ideal for programmatic access and CI/CD pipelines.' },
  { section: 'api', title: 'POST /api/parse/cfn', text: 'Parse a CloudFormation or CDK template upload via multipart form. Supports JSON and YAML. Add ?source=cdk to tag CDK-synthesized templates.' },
  { section: 'api', title: 'POST /api/parse/cfn/raw', text: 'Parse raw CloudFormation or CDK template JSON/YAML from request body. Ideal for programmatic access.' },
  { section: 'api', title: 'POST /api/github/token', text: 'Exchange GitHub OAuth authorization code for access token. Returns token username and avatar.' },
  { section: 'api', title: 'GET /api/github/repos', text: 'List authenticated user repositories including private repos. Requires X-GitHub-Token header.' },
  { section: 'api', title: 'POST /api/github/scan', text: 'Scan a GitHub repository for directories containing IaC files (.tf). Returns list of projects with file counts.' },
  { section: 'api', title: 'POST /api/github/parse', text: 'Parse an IaC project directly from GitHub repo. Fetches .tf files and returns graph data. Supports private repos with token.' },
  { section: 'api', title: 'GET /health', text: 'Health check endpoint. Returns status ok and version.' },
  { section: 'api', title: 'Authentication', text: 'GitHub token passed via X-GitHub-Token header. Optional for public repos, required for private repos. Increases rate limit from 60 to 5000 requests per hour.' },
  // Keyboard
  { section: 'keyboard', title: 'Keyboard Shortcuts', text: 'Cmd+K focus search bar. Escape clear search deselect node. ? toggle keyboard shortcuts help. Scroll zoom. Click drag pan canvas.' },
  { section: 'keyboard', title: 'Canvas Controls', text: 'Zoom in out. Fit view auto-fit all nodes. Toggle interactivity lock unlock panning zooming. Minimap overview.' },
];

const docsSections: Section[] = ['overview', 'quickstart', 'github', 'providers', 'keyboard'];

export function DocsPage() {
  const location = useLocation();
  const isApiPage = location.pathname === '/reference';
  const urlSection = pathToSection[location.pathname] ?? 'overview';
  const [override, setOverride] = useState<Section | null>(null);
  const [lastPath, setLastPath] = useState(location.pathname);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset override when URL changes (user clicked a nav link)
  if (location.pathname !== lastPath) {
    setOverride(null);
    setLastPath(location.pathname);
  }

  const active = override ?? urlSection;
  const setActive = (s: Section) => {
    setOverride(s);
    setSearchQuery('');
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter(
      (e) => e.title.toLowerCase().includes(q) || e.text.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
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
          {[{ label: 'Docs', path: '/docs' }, { label: 'API', path: '/reference' }, { label: 'AI', path: '/ai' }].map(({ label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={label}
                to={path}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <a
            href="https://github.com/manimovassagh/infragraph"
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
      {isApiPage ? (
        /* API Reference — full-width, dedicated layout */
        <div className="max-w-5xl mx-auto px-8 py-8">
          <ApiSection />
        </div>
      ) : (
        /* Documentation — sidebar + content */
        <div className="max-w-6xl mx-auto px-8 py-8 flex gap-12">
          {/* Sidebar */}
          <aside className="hidden md:block w-48 shrink-0">
            <div className="sticky top-8">
              <div className="relative mb-4">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors"
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Documentation
              </p>
              <nav className="flex flex-col gap-0.5">
                {sections.filter(s => docsSections.includes(s.id)).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active === s.id
                        ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
                <Link
                  to="/reference"
                  className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                >
                  API Reference
                  <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Mobile section tabs */}
            <div className="md:hidden flex gap-1 mb-8 overflow-x-auto pb-2">
              {sections.filter(s => docsSections.includes(s.id)).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    active === s.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {isSearching ? (
              <SearchResults
                results={searchResults}
                query={searchQuery}
                onNavigate={(section) => {
                  setActive(section);
                  setSearchQuery('');
                }}
              />
            ) : (
              <>
                {active === 'overview' && <OverviewSection onNavigate={setActive} />}
                {active === 'quickstart' && <QuickStartSection />}
                {active === 'github' && <GitHubSection />}
                {active === 'providers' && <ProvidersSection />}
                {active === 'keyboard' && <KeyboardSection dark={dark} />}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-500/30 text-inherit rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const sectionLabels: Record<Section, string> = {
  overview: 'Overview',
  quickstart: 'Quick Start',
  github: 'GitHub Integration',
  providers: 'Providers',
  api: 'API Reference',
  keyboard: 'Keyboard Shortcuts',
};

function SearchResults({
  results,
  query,
  onNavigate,
}: {
  results: SearchEntry[];
  query: string;
  onNavigate: (section: Section) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No results for &ldquo;{query}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
        {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
      </p>
      {results.map((r, i) => (
        <button
          key={i}
          onClick={() => onNavigate(r.section)}
          className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-500/5 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
              {sectionLabels[r.section]}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {highlightMatch(r.title, query)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {highlightMatch(r.text, query)}
          </p>
        </button>
      ))}
    </div>
  );
}

/* ─── Overview Section ──────────────────────────────────────────────── */

function OverviewSection({ onNavigate }: { onNavigate: (s: Section) => void }) {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">InfraGraph Documentation</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
          InfraGraph is an open-source infrastructure visualization platform that transforms
          your Terraform, CloudFormation, and CDK code into interactive, multi-cloud architecture diagrams — in seconds.
        </p>
      </div>

      {/* Hero screenshot */}
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
        <img
          src="/screenshots/canvas-aws.png"
          alt="InfraGraph AWS architecture diagram showing VPCs, subnets, EC2 instances, and other resources"
          className="w-full"
          loading="lazy"
        />
      </div>

      {/* Value props */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              </svg>
            ),
            title: 'Multi-Cloud',
            desc: 'AWS, Azure, and GCP with automatic provider detection from your resource types.',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            ),
            title: 'GitHub Native',
            desc: 'Connect your GitHub account to browse repos and parse IaC projects directly.',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            ),
            title: 'API-First',
            desc: 'Full REST API for programmatic access. Integrate into CI/CD, scripts, or your own tools.',
          },
        ].map((item) => (
          <div key={item.title} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2.5 mb-2 text-violet-600 dark:text-violet-400">
              {item.icon}
              <h3 className="font-semibold text-sm">{item.title}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Provide Your IaC', desc: 'Upload a Terraform, CloudFormation, or CDK file — or connect a GitHub repo.' },
            { step: '2', title: 'Parse & Analyze', desc: 'InfraGraph extracts resources, resolves dependencies, and detects the cloud provider.' },
            { step: '3', title: 'Visualize', desc: 'Interactive diagram with nested containers, searchable resources, and export to PNG.' },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-bold shrink-0">{item.step}</span>
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Use Cases</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: 'Architecture Reviews', desc: 'Visualize infrastructure before and after changes. Share diagrams in pull request discussions.' },
            { title: 'Team Onboarding', desc: 'Give new engineers an instant visual overview of your cloud infrastructure across all environments.' },
            { title: 'Compliance & Audits', desc: 'Generate up-to-date architecture diagrams for security reviews and compliance documentation.' },
            { title: 'CI/CD Integration', desc: 'Call the API from pipelines to auto-generate diagrams on every infrastructure change.' },
            { title: 'Documentation', desc: 'Export diagrams as PNG for wikis, runbooks, and internal documentation. Always current, never stale.' },
            { title: 'Multi-Cloud Visibility', desc: 'Visualize AWS, Azure, and GCP infrastructure side by side with consistent, provider-branded diagrams.' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-violet-500 mt-0.5 shrink-0">&#9679;</span>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('quickstart')}
          className="p-4 rounded-xl border text-left transition-colors border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5 hover:bg-violet-100 dark:hover:bg-violet-500/10"
        >
          <p className="font-semibold text-sm text-violet-700 dark:text-violet-300">Quick Start Guide &rarr;</p>
        </button>
        <button
          onClick={() => onNavigate('github')}
          className="p-4 rounded-xl border text-left transition-colors border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <p className="font-semibold text-sm text-slate-900 dark:text-white">GitHub Integration &rarr;</p>
        </button>
        <Link
          to="/reference"
          className="p-4 rounded-xl border text-left transition-colors border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <p className="font-semibold text-sm text-slate-900 dark:text-white">API Reference &rarr;</p>
        </Link>
      </div>
    </div>
  );
}

/* ─── Quick Start Section ───────────────────────────────────────────── */

function QuickStartSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quick Start</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
          Get your infrastructure visualized in under 30 seconds.
        </p>
      </div>

      {/* Home page screenshot */}
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md">
        <img
          src="/screenshots/home-dark.png"
          alt="InfraGraph home page with upload zone, GitHub connect button, and sample infrastructure buttons"
          className="w-full"
          loading="lazy"
        />
      </div>

      {/* Step 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-bold">1</span>
          <h2 className="text-xl font-semibold">Upload your IaC file</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 ml-10">
          Drop your infrastructure file onto the upload zone, or click to browse.
          InfraGraph auto-detects the IaC tool and cloud provider from your file content.
        </p>
        <div className="ml-10 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <strong className="text-slate-700 dark:text-slate-300">Supported formats:</strong>
          </p>
          <ul className="mt-2 text-sm text-slate-500 dark:text-slate-400 space-y-1">
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Terraform state files (<code className="text-xs font-mono">.tfstate</code>)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              HCL configuration files (<code className="text-xs font-mono">.tf</code>) — single or multiple
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              CloudFormation templates (<code className="text-xs font-mono">.yaml</code>, <code className="text-xs font-mono">.yml</code>, <code className="text-xs font-mono">.json</code>, <code className="text-xs font-mono">.template</code>)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              CDK-synthesized templates (<code className="text-xs font-mono">cdk synth</code> output — auto-detected)
            </li>
          </ul>
        </div>
      </div>

      {/* Step 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-bold">2</span>
          <h2 className="text-xl font-semibold">Parse and visualize</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 ml-10">
          Click <strong>Parse</strong> to send the file to the backend. InfraGraph extracts resources,
          resolves relationships, and builds a nested graph with VPCs, subnets, and their children
          laid out automatically.
        </p>
      </div>

      {/* Step 3 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-bold">3</span>
          <h2 className="text-xl font-semibold">Explore your infrastructure</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 ml-10">
          Interact with the architecture diagram:
        </p>
        <ul className="ml-10 text-sm text-slate-500 dark:text-slate-400 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5">&#9679;</span>
            <span><strong className="text-slate-700 dark:text-slate-300">Click a node</strong> to inspect its attributes, tags, and connections in the side panel</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5">&#9679;</span>
            <span><strong className="text-slate-700 dark:text-slate-300">Search</strong> resources with <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono border border-slate-200 dark:border-slate-600">&#8984;K</kbd></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5">&#9679;</span>
            <span><strong className="text-slate-700 dark:text-slate-300">Filter</strong> by resource type using the toolbar icons</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5">&#9679;</span>
            <span><strong className="text-slate-700 dark:text-slate-300">Export</strong> the diagram as PNG for documentation</span>
          </li>
        </ul>
      </div>

      {/* Alternative: GitHub */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-600 text-white text-sm font-bold">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d={GITHUB_PATH} /></svg>
          </span>
          <h2 className="text-xl font-semibold">Or connect from GitHub</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 ml-10">
          Click <strong>Connect GitHub Repo</strong> on the home page to browse your repositories
          and select an IaC project directly — no file downloads needed. Works with both
          public and private repos.
        </p>
      </div>

      {/* Try it now */}
      <div className="p-5 rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5">
        <p className="font-semibold text-violet-700 dark:text-violet-300">Try it now</p>
        <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">
          Don&#39;t have an IaC file handy? Use the sample buttons on the{' '}
          <Link to="/" className="underline hover:no-underline">home page</Link> to load
          a pre-built AWS, Azure, GCP, or CloudFormation infrastructure.
        </p>
      </div>
    </div>
  );
}

/* ─── GitHub Integration Section ────────────────────────────────────── */

function GitHubSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">GitHub Integration</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
          Connect your GitHub account to browse repositories, scan for IaC projects,
          and visualize infrastructure — all without downloading files.
        </p>
      </div>

      {/* How it works */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Connect Your Account</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          InfraGraph uses GitHub OAuth to securely access your repositories. Your token is stored
          locally in your browser and never persisted on the server.
        </p>
        <ol className="text-sm text-slate-500 dark:text-slate-400 space-y-3 ml-4">
          <li className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold shrink-0 mt-0.5">1</span>
            <span>Click <strong className="text-slate-700 dark:text-slate-300">Connect GitHub Repo</strong> on the home page</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold shrink-0 mt-0.5">2</span>
            <span>Click <strong className="text-slate-700 dark:text-slate-300">Connect to GitHub</strong> — a popup opens for authorization</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold shrink-0 mt-0.5">3</span>
            <span>Authorize InfraGraph — the popup closes and you&#39;re connected</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold shrink-0 mt-0.5">4</span>
            <span>Browse your repos, select one, pick an IaC project, and visualize</span>
          </li>
        </ol>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Features</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: 'Private Repos', desc: 'Access private repositories after connecting your GitHub account. Private repos are shown with a lock icon.' },
            { title: 'Repo Search', desc: 'Instantly search across all your repositories by name. Results update as you type.' },
            { title: 'Auto-Scan', desc: 'InfraGraph scans the entire repository tree to find directories containing .tf files — no manual path entry needed.' },
            { title: 'Direct Parse', desc: 'Parse IaC files directly from GitHub. Files are fetched on demand — nothing is cloned or stored locally.' },
          ].map((item) => (
            <div key={item.title} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Public URL fallback */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Public Repos (No Auth Required)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You can scan any public GitHub repository without connecting your account.
          Just paste the repo URL in the input field:
        </p>
        <CodeBlock lang="text">{`https://github.com/hashicorp/terraform-provider-aws`}</CodeBlock>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Note: Public access is limited to 60 GitHub API requests per hour.
          Connecting your account increases this to 5,000 requests per hour.
        </p>
      </div>

      {/* Security */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Security & Privacy</p>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-green-500 shrink-0">&#10003;</span>
            <span>GitHub tokens are stored in your browser only — never on InfraGraph servers</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 shrink-0">&#10003;</span>
            <span>OAuth scope is limited to <code className="text-xs font-mono">repo</code> (read access)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 shrink-0">&#10003;</span>
            <span>Click <strong className="text-slate-700 dark:text-slate-300">Disconnect</strong> at any time to revoke access</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 shrink-0">&#10003;</span>
            <span>No code is cloned, stored, or cached — files are fetched on demand and processed in memory</span>
          </li>
        </ul>
      </div>

      {/* API usage */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Programmatic Access</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The GitHub integration is also available via the REST API. Scan repos and parse projects
          from CI/CD pipelines, scripts, or custom integrations:
        </p>
        <CodeBlock lang="bash">{`# Scan a repo for IaC projects
curl -X POST http://localhost:3001/api/github/scan \\
  -H "Content-Type: application/json" \\
  -H "X-GitHub-Token: ghp_your_token" \\
  -d '{"repoUrl": "https://github.com/your-org/infrastructure"}'

# Parse a specific project
curl -X POST http://localhost:3001/api/github/parse \\
  -H "Content-Type: application/json" \\
  -H "X-GitHub-Token: ghp_your_token" \\
  -d '{"repoUrl": "https://github.com/your-org/infrastructure", "projectPath": "prod"}'`}</CodeBlock>
      </div>
    </div>
  );
}

/* ─── Providers Section ─────────────────────────────────────────────── */

function ProvidersSection() {
  const providers = [
    {
      name: 'AWS',
      color: '#FF9900',
      prefix: 'aws_',
      types: [
        'VPC', 'Subnet', 'EC2 Instance', 'RDS Database', 'S3 Bucket',
        'Lambda Function', 'Load Balancer (ALB/NLB)', 'Security Group',
        'Internet Gateway', 'NAT Gateway', 'Elastic IP', 'ECS Cluster',
        'ECS Service', 'CloudFront Distribution', 'DynamoDB Table',
        'SNS Topic', 'SQS Queue', 'Route53 Zone', 'IAM Role', 'EKS Cluster',
      ],
    },
    {
      name: 'Azure',
      color: '#0078D4',
      prefix: 'azurerm_',
      types: [
        'Virtual Network', 'Subnet', 'Virtual Machine', 'SQL Database',
        'SQL Server', 'Storage Account', 'Function App', 'Load Balancer',
        'Public IP', 'Network Security Group', 'Kubernetes Cluster (AKS)',
        'App Service',
      ],
    },
    {
      name: 'GCP',
      color: '#4285F4',
      prefix: 'google_',
      types: [
        'VPC Network', 'Subnetwork', 'Compute Instance', 'Cloud SQL Instance',
        'Cloud Storage Bucket', 'Cloud Function', 'Forwarding Rule (LB)',
        'Firewall Rule', 'GKE Cluster', 'Pub/Sub Topic', 'Cloud Run Service',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
          InfraGraph supports three major cloud providers with automatic detection and
          provider-branded visual components.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <strong className="text-slate-700 dark:text-slate-300">Auto-detection:</strong>{' '}
          InfraGraph detects the cloud provider from resource type prefixes
          (<code className="text-xs font-mono">aws_</code>,{' '}
          <code className="text-xs font-mono">azurerm_</code>,{' '}
          <code className="text-xs font-mono">google_</code>). You can also override
          the provider with the <code className="text-xs font-mono">?provider=</code> query parameter.
        </p>
      </div>

      {providers.map((p) => (
        <div key={p.name} className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge color={p.color}>{p.name}</Badge>
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <span className="text-sm text-slate-400 dark:text-slate-500">{p.types.length} resource types</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Prefix: <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{p.prefix}*</code>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.types.map((t) => (
              <span
                key={t}
                className="px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Container Nesting</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          InfraGraph automatically nests resources inside their parent containers based on provider configuration:
        </p>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1 ml-4">
          <li><strong className="text-slate-700 dark:text-slate-300">AWS:</strong> Resources inside Subnets inside VPCs</li>
          <li><strong className="text-slate-700 dark:text-slate-300">Azure:</strong> Resources inside Subnets inside Virtual Networks</li>
          <li><strong className="text-slate-700 dark:text-slate-300">GCP:</strong> Resources inside Subnetworks inside VPC Networks</li>
        </ul>
      </div>
    </div>
  );
}

/* ─── API Reference Section ─────────────────────────────────────────── */

function ApiSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
          InfraGraph exposes a full REST API for programmatic access. Integrate infrastructure
          visualization into your CI/CD pipelines, internal tools, or custom workflows.
        </p>
      </div>

      {/* Base URL & Swagger */}
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-300">Base URL:</strong>{' '}
              <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                http://localhost:3001
              </code>
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <strong className="text-slate-700 dark:text-slate-300">Swagger UI:</strong>{' '}
            Interactive API docs at{' '}
            <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              /docs
            </code>{' '}
            — try endpoints directly from the browser.
          </p>
        </div>
      </div>

      {/* Authentication */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Authentication</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parse endpoints work without authentication for public data. To access private GitHub
          repos, pass a GitHub token via the <code className="text-xs font-mono">X-GitHub-Token</code> header:
        </p>
        <CodeBlock lang="bash">{`# Public repos — no auth needed
curl -X POST http://localhost:3001/api/github/scan \\
  -H "Content-Type: application/json" \\
  -d '{"repoUrl": "https://github.com/hashicorp/terraform"}'

# Private repos — pass your GitHub token
curl -X POST http://localhost:3001/api/github/scan \\
  -H "Content-Type: application/json" \\
  -H "X-GitHub-Token: ghp_your_token" \\
  -d '{"repoUrl": "https://github.com/your-org/private-infra"}'`}</CodeBlock>
        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Rate limits:</strong> Without a token, GitHub allows 60 requests/hour.
            With a token, you get 5,000 requests/hour.
          </p>
        </div>
      </div>

      {/* Divider: Parse Endpoints */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <h2 className="text-lg font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs mb-6">Parse Endpoints</h2>
      </div>

      {/* POST /api/parse */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            POST
          </span>
          <code className="text-sm font-mono font-semibold">/api/parse</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parse a <code className="text-xs font-mono">.tfstate</code> file via multipart upload
          and return the architecture graph.
        </p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Request</p>
          <CodeBlock lang="bash">{`curl -X POST http://localhost:3001/api/parse \\
  -F "tfstate=@terraform.tfstate"

# With provider override:
curl -X POST "http://localhost:3001/api/parse?provider=aws" \\
  -F "tfstate=@terraform.tfstate"`}</CodeBlock>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Response</p>
          <CodeBlock lang="json">{`{
  "nodes": [...],          // React Flow graph nodes (id, type, position, data)
  "edges": [...],          // React Flow graph edges (source, target, label)
  "resources": [...],      // Extracted resource objects (type, name, attributes)
  "provider": "aws",       // Detected or specified cloud provider
  "warnings": [],          // Parse warnings (if any)
  "iacSource": "terraform-state"  // "terraform-state" | "terraform-hcl" | "cloudformation" | "cdk"
}`}</CodeBlock>
        </div>
      </div>

      {/* POST /api/parse/hcl */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            POST
          </span>
          <code className="text-sm font-mono font-semibold">/api/parse/hcl</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parse multiple <code className="text-xs font-mono">.tf</code> HCL configuration files
          and return the architecture graph.
        </p>
        <CodeBlock lang="bash">{`curl -X POST http://localhost:3001/api/parse/hcl \\
  -F "files=@main.tf" \\
  -F "files=@variables.tf" \\
  -F "files=@outputs.tf"`}</CodeBlock>
      </div>

      {/* POST /api/parse/raw */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            POST
          </span>
          <code className="text-sm font-mono font-semibold">/api/parse/raw</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parse raw tfstate JSON from the request body. Ideal for programmatic access
          when you already have the state as a string.
        </p>
        <CodeBlock lang="bash">{`curl -X POST http://localhost:3001/api/parse/raw \\
  -H "Content-Type: application/json" \\
  -d '{"tfstate": "<your-state-json-string>"}'`}</CodeBlock>
      </div>

      {/* POST /api/parse/cfn */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            POST
          </span>
          <code className="text-sm font-mono font-semibold">/api/parse/cfn</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parse a CloudFormation or CDK template via multipart upload. Supports JSON and YAML formats.
          Add <code className="text-xs font-mono">?source=cdk</code> to tag CDK-synthesized templates.
        </p>
        <CodeBlock lang="bash">{`# CloudFormation template
curl -X POST http://localhost:3001/api/parse/cfn \\
  -F "template=@my-stack.yaml"

# CDK-synthesized template
curl -X POST "http://localhost:3001/api/parse/cfn?source=cdk" \\
  -F "template=@cdk.out/MyStack.template.json"`}</CodeBlock>
      </div>

      {/* POST /api/parse/cfn/raw */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            POST
          </span>
          <code className="text-sm font-mono font-semibold">/api/parse/cfn/raw</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parse raw CloudFormation/CDK template content from the request body. Accepts JSON or YAML strings.
        </p>
        <CodeBlock lang="bash">{`curl -X POST http://localhost:3001/api/parse/cfn/raw \\
  -H "Content-Type: application/json" \\
  -d '{"template": "<your-cfn-template-string>"}'`}</CodeBlock>
      </div>

      {/* Divider: GitHub Endpoints */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <h2 className="text-lg font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs mb-6">GitHub Endpoints</h2>
      </div>

      {/* POST /api/github/token */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            POST
          </span>
          <code className="text-sm font-mono font-semibold">/api/github/token</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Exchange a GitHub OAuth authorization code for an access token.
          Returns the token along with the authenticated user&#39;s profile.
        </p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Request</p>
          <CodeBlock lang="bash">{`curl -X POST http://localhost:3001/api/github/token \\
  -H "Content-Type: application/json" \\
  -d '{"code": "github_oauth_code"}'`}</CodeBlock>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Response</p>
          <CodeBlock lang="json">{`{
  "access_token": "gho_xxxxxxxxxxxx",
  "username": "octocat",
  "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4"
}`}</CodeBlock>
        </div>
      </div>

      {/* GET /api/github/repos */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
            GET
          </span>
          <code className="text-sm font-mono font-semibold">/api/github/repos</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          List the authenticated user&#39;s repositories, sorted by most recently pushed.
          Includes private repositories.
        </p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Request</p>
          <CodeBlock lang="bash">{`curl http://localhost:3001/api/github/repos \\
  -H "X-GitHub-Token: gho_your_token"`}</CodeBlock>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Response</p>
          <CodeBlock lang="json">{`[
  {
    "name": "infrastructure",
    "full_name": "your-org/infrastructure",
    "description": "Production cloud infrastructure",
    "private": true,
    "pushed_at": "2026-02-24T10:30:00Z",
    "default_branch": "main",
    "html_url": "https://github.com/your-org/infrastructure"
  }
]`}</CodeBlock>
        </div>
      </div>

      {/* POST /api/github/scan */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            POST
          </span>
          <code className="text-sm font-mono font-semibold">/api/github/scan</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Scan a GitHub repository for directories containing <code className="text-xs font-mono">.tf</code> files.
          Returns a list of IaC projects with their file listings.
        </p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Request</p>
          <CodeBlock lang="bash">{`curl -X POST http://localhost:3001/api/github/scan \\
  -H "Content-Type: application/json" \\
  -H "X-GitHub-Token: gho_your_token" \\
  -d '{"repoUrl": "https://github.com/your-org/infrastructure"}'`}</CodeBlock>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Response</p>
          <CodeBlock lang="json">{`{
  "owner": "your-org",
  "repo": "infrastructure",
  "defaultBranch": "main",
  "projects": [
    {
      "path": "environments/production",
      "files": ["main.tf", "variables.tf", "outputs.tf"],
      "resourceCount": 0
    },
    {
      "path": "modules/networking",
      "files": ["vpc.tf", "subnets.tf"],
      "resourceCount": 0
    }
  ]
}`}</CodeBlock>
        </div>
      </div>

      {/* POST /api/github/parse */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            POST
          </span>
          <code className="text-sm font-mono font-semibold">/api/github/parse</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parse an IaC project directly from a GitHub repository. Fetches <code className="text-xs font-mono">.tf</code> files
          from the specified directory, parses HCL, and returns graph data.
        </p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Request</p>
          <CodeBlock lang="bash">{`curl -X POST http://localhost:3001/api/github/parse \\
  -H "Content-Type: application/json" \\
  -H "X-GitHub-Token: gho_your_token" \\
  -d '{
    "repoUrl": "https://github.com/your-org/infrastructure",
    "projectPath": "environments/production"
  }'`}</CodeBlock>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Response</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Same response format as <code className="text-xs font-mono">/api/parse</code> — nodes, edges, resources, provider, warnings.
          </p>
        </div>
      </div>

      {/* Divider: System */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <h2 className="text-lg font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs mb-6">System</h2>
      </div>

      {/* GET /health */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
            GET
          </span>
          <code className="text-sm font-mono font-semibold">/health</code>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Health check endpoint. Use for monitoring and load balancer health probes.
        </p>
        <CodeBlock lang="json">{`{ "status": "ok", "version": "4.0.0" }`}</CodeBlock>
      </div>

      {/* Error format */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Error Responses</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          All errors return a consistent JSON object with <code className="text-xs font-mono">error</code> and
          optional <code className="text-xs font-mono">details</code> fields:
        </p>
        <CodeBlock lang="json">{`{
  "error": "Failed to parse tfstate",
  "details": "Unexpected token at position 42"
}`}</CodeBlock>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="py-2 font-semibold text-slate-700 dark:text-slate-300">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-slate-500 dark:text-slate-400">
              <tr className="border-b border-slate-100 dark:border-slate-800"><td className="py-2 pr-4 font-mono text-xs">400</td><td className="py-2">Bad request — missing or invalid input</td></tr>
              <tr className="border-b border-slate-100 dark:border-slate-800"><td className="py-2 pr-4 font-mono text-xs">401</td><td className="py-2">Unauthorized — missing or invalid GitHub token</td></tr>
              <tr className="border-b border-slate-100 dark:border-slate-800"><td className="py-2 pr-4 font-mono text-xs">404</td><td className="py-2">Not found — repo or project path not found</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">422</td><td className="py-2">Unprocessable — parse or processing failed</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Keyboard Section ──────────────────────────────────────────────── */

function KeyboardSection({ dark }: { dark: boolean }) {
  const shortcuts = [
    { keys: ['\u2318', 'K'], desc: 'Focus search bar' },
    { keys: ['Esc'], desc: 'Clear search / deselect node' },
    { keys: ['?'], desc: 'Toggle keyboard shortcuts help' },
    { keys: ['Scroll'], desc: 'Zoom in/out on canvas' },
    { keys: ['Click + Drag'], desc: 'Pan the canvas' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keyboard Shortcuts</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
          Navigate the architecture diagram efficiently.
        </p>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {shortcuts.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">{s.desc}</span>
            <div className="flex items-center gap-1">
              {s.keys.map((k, j) => (
                <kbd
                  key={j}
                  className={`px-2 py-1 rounded text-xs font-mono font-medium border ${
                    dark
                      ? 'bg-slate-800 border-slate-600 text-slate-300'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Canvas Controls</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The bottom-left control panel provides:
        </p>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1 ml-4">
          <li><strong className="text-slate-700 dark:text-slate-300">Zoom In / Out:</strong> Adjust zoom level</li>
          <li><strong className="text-slate-700 dark:text-slate-300">Fit View:</strong> Auto-fit all nodes into the viewport</li>
          <li><strong className="text-slate-700 dark:text-slate-300">Toggle Interactivity:</strong> Lock/unlock canvas panning and zooming</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Minimap</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The bottom-right minimap shows an overview of the entire graph. Click anywhere on
          the minimap to jump to that area.
        </p>
      </div>
    </div>
  );
}
