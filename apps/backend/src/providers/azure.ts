import type { ProviderConfig } from '@infragraph/shared';

export const azureProvider: ProviderConfig = {
  id: 'azure',
  name: 'Microsoft Azure',
  shortName: 'Azure',
  resourcePrefix: 'azurerm_',

  supportedTypes: new Set([
    'azurerm_resource_group',
    'azurerm_virtual_network',
    'azurerm_subnet',
    'azurerm_network_security_group',
    'azurerm_public_ip',
    'azurerm_network_interface',
    'azurerm_virtual_machine',
    'azurerm_linux_virtual_machine',
    'azurerm_windows_virtual_machine',
    'azurerm_managed_disk',
    'azurerm_storage_account',
    'azurerm_storage_container',
    'azurerm_sql_server',
    'azurerm_sql_database',
    'azurerm_lb',
    'azurerm_lb_rule',
    'azurerm_application_gateway',
    'azurerm_function_app',
    'azurerm_app_service',
    'azurerm_kubernetes_cluster',
    'azurerm_container_registry',
  ]),

  edgeAttributes: [
    ['virtual_network_name', 'in vnet'],
    ['subnet_id', 'in subnet'],
    ['network_security_group_id', 'secured by'],
    ['public_ip_address_id', 'uses pip'],
    ['resource_group_name', 'in rg'],
    ['network_interface_ids', 'attached to'],
    ['load_balancer_id', 'behind lb'],
  ],

  containerTypes: [
    { type: 'azurerm_virtual_network', parentAttr: 'virtual_network_name', nodeType: 'vpcNode' },
    { type: 'azurerm_subnet', parentAttr: 'subnet_id', nodeType: 'subnetNode' },
  ],

  nodeTypeMapping: {
    azurerm_virtual_network: 'vpcNode',
    azurerm_subnet: 'subnetNode',
    azurerm_network_security_group: 'securityGroupNode',
    azurerm_public_ip: 'eipNode',
    azurerm_virtual_machine: 'ec2Node',
    azurerm_linux_virtual_machine: 'ec2Node',
    azurerm_windows_virtual_machine: 'ec2Node',
    azurerm_storage_account: 's3Node',
    azurerm_sql_server: 'rdsNode',
    azurerm_sql_database: 'rdsNode',
    azurerm_lb: 'lbNode',
    azurerm_application_gateway: 'lbNode',
    azurerm_function_app: 'lambdaNode',
    azurerm_kubernetes_cluster: 'genericNode',
  },

  extractRegion(attrs: Record<string, unknown>): string | undefined {
    const location = attrs['location'];
    if (typeof location === 'string') return location;
    return undefined;
  },

  refPattern: /^(azurerm_\w+)\.(\w+)(?:\.\w+)?$/,
};
