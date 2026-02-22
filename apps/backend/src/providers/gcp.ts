import type { ProviderConfig } from '@infragraph/shared';

export const gcpProvider: ProviderConfig = {
  id: 'gcp',
  name: 'Google Cloud Platform',
  shortName: 'GCP',
  resourcePrefix: 'google_',

  supportedTypes: new Set([
    'google_compute_network',
    'google_compute_subnetwork',
    'google_compute_firewall',
    'google_compute_instance',
    'google_compute_address',
    'google_compute_global_address',
    'google_compute_forwarding_rule',
    'google_compute_target_pool',
    'google_compute_instance_group',
    'google_storage_bucket',
    'google_sql_database_instance',
    'google_sql_database',
    'google_cloudfunctions_function',
    'google_cloud_run_service',
    'google_container_cluster',
    'google_container_node_pool',
    'google_pubsub_topic',
    'google_pubsub_subscription',
  ]),

  edgeAttributes: [
    ['network', 'in network'],
    ['subnetwork', 'in subnet'],
    ['network_interface', 'attached to'],
    ['target_pool', 'behind pool'],
    ['firewall_policy', 'secured by'],
  ],

  containerTypes: [
    { type: 'google_compute_network', parentAttr: 'network', nodeType: 'vpcNode' },
    { type: 'google_compute_subnetwork', parentAttr: 'subnetwork', nodeType: 'subnetNode' },
  ],

  nodeTypeMapping: {
    google_compute_network: 'vpcNode',
    google_compute_subnetwork: 'subnetNode',
    google_compute_firewall: 'securityGroupNode',
    google_compute_instance: 'ec2Node',
    google_compute_address: 'eipNode',
    google_compute_global_address: 'eipNode',
    google_compute_forwarding_rule: 'lbNode',
    google_storage_bucket: 's3Node',
    google_sql_database_instance: 'rdsNode',
    google_cloudfunctions_function: 'lambdaNode',
    google_cloud_run_service: 'lambdaNode',
    google_container_cluster: 'genericNode',
  },

  extractRegion(attrs: Record<string, unknown>): string | undefined {
    const region = attrs['region'] ?? attrs['zone'];
    if (typeof region === 'string') return region;
    return undefined;
  },

  refPattern: /^(google_\w+)\.(\w+)(?:\.\w+)?$/,
};
