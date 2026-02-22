import type { CloudProvider, ProviderConfig, Tfstate } from '@infragraph/shared';
import { awsProvider } from './aws.js';
import { azureProvider } from './azure.js';
import { gcpProvider } from './gcp.js';

const providers: Record<CloudProvider, ProviderConfig> = {
  aws: awsProvider,
  azure: azureProvider,
  gcp: gcpProvider,
};

export function getProvider(id: CloudProvider): ProviderConfig {
  return providers[id];
}

/**
 * Auto-detect the cloud provider from a parsed tfstate by checking
 * resource type prefixes. Falls back to AWS if undetermined.
 */
export function detectProvider(tfstate: Tfstate): ProviderConfig {
  const counts: Record<CloudProvider, number> = { aws: 0, azure: 0, gcp: 0 };

  for (const resource of tfstate.resources) {
    if (resource.mode !== 'managed') continue;
    if (resource.type.startsWith('aws_')) counts.aws++;
    else if (resource.type.startsWith('azurerm_')) counts.azure++;
    else if (resource.type.startsWith('google_')) counts.gcp++;
  }

  // Pick the provider with the most resources
  let best: CloudProvider = 'aws';
  let bestCount = 0;
  for (const [id, count] of Object.entries(counts) as [CloudProvider, number][]) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }

  return providers[best];
}

/**
 * Auto-detect provider from HCL resource type keys.
 */
export function detectProviderFromTypes(resourceTypes: string[]): ProviderConfig {
  const counts: Record<CloudProvider, number> = { aws: 0, azure: 0, gcp: 0 };

  for (const type of resourceTypes) {
    if (type.startsWith('aws_')) counts.aws++;
    else if (type.startsWith('azurerm_')) counts.azure++;
    else if (type.startsWith('google_')) counts.gcp++;
  }

  let best: CloudProvider = 'aws';
  let bestCount = 0;
  for (const [id, count] of Object.entries(counts) as [CloudProvider, number][]) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }

  return providers[best];
}
