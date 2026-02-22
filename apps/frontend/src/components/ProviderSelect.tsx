import type { CloudProvider } from '@infragraph/shared';

interface ProviderCard {
  id: CloudProvider;
  name: string;
  description: string;
  color: string;
  enabled: boolean;
}

const providers: ProviderCard[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    description: 'VPCs, EC2, RDS, S3, Lambda, and 20+ resource types',
    color: '#ED7100',
    enabled: true,
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    description: 'VNets, VMs, Storage, SQL, Functions, and more',
    color: '#0078D4',
    enabled: false,
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    description: 'VPCs, Compute, Cloud SQL, GCS, Cloud Functions',
    color: '#4285F4',
    enabled: false,
  },
];

interface ProviderSelectProps {
  onSelect: (provider: CloudProvider) => void;
}

export function ProviderSelect({ onSelect }: ProviderSelectProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          InfraGraph
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          Visualize your Terraform infrastructure
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => p.enabled && onSelect(p.id)}
            disabled={!p.enabled}
            className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all text-center ${
              p.enabled
                ? 'border-slate-200 dark:border-slate-700 hover:border-current hover:shadow-lg cursor-pointer bg-white dark:bg-slate-800'
                : 'border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900'
            }`}
            style={p.enabled ? { '--tw-ring-color': p.color } as React.CSSProperties : undefined}
          >
            {!p.enabled && (
              <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                Coming soon
              </span>
            )}
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: p.color }}
            >
              {p.id === 'aws' ? 'AWS' : p.id === 'azure' ? 'Az' : 'GCP'}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{p.description}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Select a cloud provider to get started
      </p>
    </main>
  );
}
