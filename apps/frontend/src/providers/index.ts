import type { CloudProvider } from '@infragraph/shared';
import type { ProviderFrontendConfig } from './types';

// Eagerly load AWS since it's the primary provider.
// Azure/GCP use dynamic import() so their code isn't bundled unless selected.
import { awsFrontendConfig } from './aws';

const cache = new Map<CloudProvider, ProviderFrontendConfig>();
cache.set('aws', awsFrontendConfig);

export async function getProviderFrontendConfig(
  provider: CloudProvider,
): Promise<ProviderFrontendConfig> {
  const cached = cache.get(provider);
  if (cached) return cached;

  let config: ProviderFrontendConfig;
  switch (provider) {
    case 'azure': {
      const mod = await import('./azure');
      config = mod.azureFrontendConfig;
      break;
    }
    case 'gcp': {
      const mod = await import('./gcp');
      config = mod.gcpFrontendConfig;
      break;
    }
    default:
      config = awsFrontendConfig;
  }

  cache.set(provider, config);
  return config;
}

/** Synchronous access — only works after getProviderFrontendConfig has been called */
export function getProviderFrontendConfigSync(
  provider: CloudProvider,
): ProviderFrontendConfig | undefined {
  return cache.get(provider);
}

export type { ProviderFrontendConfig } from './types';
