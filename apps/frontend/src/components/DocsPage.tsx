import { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const GITHUB_PATH =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

type Section = 'quickstart' | 'providers' | 'api' | 'keyboard';

const sections: { id: Section; label: string }[] = [
  { id: 'quickstart', label: 'Quick Start' },
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
  '/docs': 'quickstart',
  '/api': 'api',
  '/ai': 'quickstart',
};

interface SearchEntry {
  section: Section;
  title: string;
  text: string;
}

const searchIndex: SearchEntry[] = [
  { section: 'quickstart', title: 'Upload your Terraform file', text: 'Drop a .tfstate or .tf file onto the upload zone, or click to browse. InfraGraph auto-detects the cloud provider. Supported formats: Terraform state files, HCL configuration files, JSON-format state files.' },
  { section: 'quickstart', title: 'Parse and visualize', text: 'Click Parse to send the file to the backend. InfraGraph extracts resources, resolves relationships, and builds a nested graph with VPCs, subnets laid out automatically.' },
  { section: 'quickstart', title: 'Explore your infrastructure', text: 'Click a node to inspect attributes tags connections. Search resources with Cmd+K. Filter by resource type. Export diagram as PNG.' },
  { section: 'providers', title: 'AWS Provider', text: 'AWS VPC Subnet EC2 Instance RDS S3 Bucket Lambda Function Load Balancer Security Group Internet Gateway NAT Gateway ECS EKS CloudFront DynamoDB SNS SQS Route53 IAM' },
  { section: 'providers', title: 'Azure Provider', text: 'Azure Virtual Network Subnet Virtual Machine SQL Database Storage Account Function App Load Balancer Public IP Network Security Group AKS App Service' },
  { section: 'providers', title: 'GCP Provider', text: 'GCP VPC Network Subnetwork Compute Instance Cloud SQL Cloud Storage Cloud Function Forwarding Rule Firewall GKE Pub/Sub Cloud Run' },
  { section: 'providers', title: 'Container Nesting', text: 'Resources nested inside parent containers. AWS: Subnets inside VPCs. Azure: Subnets inside Virtual Networks. GCP: Subnetworks inside VPC Networks.' },
  { section: 'api', title: 'POST /api/parse', text: 'Parse a .tfstate file and return the architecture graph. Upload via multipart form. Provider override with query parameter.' },
  { section: 'api', title: 'POST /api/parse/hcl', text: 'Parse multiple .tf HCL files and return the architecture graph.' },
  { section: 'api', title: 'POST /api/parse/raw', text: 'Parse raw tfstate JSON string from request body.' },
  { section: 'api', title: 'GET /health', text: 'Health check endpoint. Returns status ok and version.' },
  { section: 'keyboard', title: 'Keyboard Shortcuts', text: 'Cmd+K focus search bar. Escape clear search deselect node. ? toggle keyboard shortcuts help. Scroll zoom. Click drag pan canvas.' },
  { section: 'keyboard', title: 'Canvas Controls', text: 'Zoom in out. Fit view auto-fit all nodes. Toggle interactivity lock unlock panning zooming. Minimap overview.' },
];

export function DocsPage() {
  const location = useLocation();
  const urlSection = pathToSection[location.pathname] ?? 'quickstart';
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
          {['Docs', 'API', 'AI'].map((label) => {
            const path = `/${label.toLowerCase()}`;
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
        </div>
      </nav>

      {/* Content */}
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
              {sections.map((s) => (
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
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile section tabs */}
          <div className="md:hidden flex gap-1 mb-8 overflow-x-auto pb-2">
            {sections.map((s) => (
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
              {active === 'quickstart' && <QuickStartSection />}
              {active === 'providers' && <ProvidersSection />}
              {active === 'api' && <ApiSection />}
              {active === 'keyboard' && <KeyboardSection dark={dark} />}
            </>
          )}
        </main>
      </div>
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
  quickstart: 'Quick Start',
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

function QuickStartSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quick Start</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
          Get your Terraform infrastructure visualized in under 30 seconds.
        </p>
      </div>

      {/* Step 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-bold">1</span>
          <h2 className="text-xl font-semibold">Upload your Terraform file</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 ml-10">
          Drop a <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">.tfstate</code> or{' '}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">.tf</code> file
          onto the upload zone, or click to browse. InfraGraph auto-detects the cloud provider
          from your resource types.
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
              JSON-format state files (<code className="text-xs font-mono">.json</code>)
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

      {/* Try it now */}
      <div className="p-5 rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5">
        <p className="font-semibold text-violet-700 dark:text-violet-300">Try it now</p>
        <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">
          Don&#39;t have a Terraform file handy? Use the sample buttons on the{' '}
          <Link to="/" className="underline hover:no-underline">home page</Link> to load
          a pre-built AWS, Azure, or GCP infrastructure.
        </p>
      </div>
    </div>
  );
}

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
          InfraGraph supports three major cloud providers with auto-detection.
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

function ApiSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
          InfraGraph exposes a REST API for programmatic access. The backend runs on port 3001 by default.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <strong className="text-slate-700 dark:text-slate-300">Swagger UI:</strong>{' '}
          Interactive API docs are available at{' '}
          <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
            http://localhost:3001/docs
          </code>{' '}
          when the backend is running.
        </p>
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
          Parse a <code className="text-xs font-mono">.tfstate</code> file and return the architecture graph.
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
  "nodes": [...],      // React Flow graph nodes
  "edges": [...],      // React Flow graph edges
  "resources": [...],  // Extracted CloudResource objects
  "provider": "aws",   // Detected or specified provider
  "warnings": []       // Parse warnings
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
          Parse multiple <code className="text-xs font-mono">.tf</code> HCL files and return the architecture graph.
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
          Parse raw tfstate JSON string from request body.
        </p>
        <CodeBlock lang="bash">{`curl -X POST http://localhost:3001/api/parse/raw \\
  -H "Content-Type: application/json" \\
  -d '{"tfstate": "{...}"}'`}</CodeBlock>
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
          Health check endpoint.
        </p>
        <CodeBlock lang="json">{`{ "status": "ok", "version": "1.0.0" }`}</CodeBlock>
      </div>

      {/* Error format */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Error Responses</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          All errors return a JSON object with <code className="text-xs font-mono">error</code> and
          optional <code className="text-xs font-mono">details</code> fields:
        </p>
        <CodeBlock lang="json">{`{
  "error": "Failed to parse tfstate",
  "details": "Unexpected token at position 42"
}`}</CodeBlock>
      </div>
    </div>
  );
}

function KeyboardSection({ dark }: { dark: boolean }) {
  const shortcuts = [
    { keys: ['&#8984;', 'K'], desc: 'Focus search bar' },
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
                  dangerouslySetInnerHTML={{ __html: k }}
                />
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
