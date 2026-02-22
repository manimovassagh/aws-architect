import type { Node } from 'reactflow';
import type { ProviderFrontendConfig } from '../types';

import { AzureVnetNode } from '@/components/nodes/azure/AzureVnetNode';
import { AzureSubnetNode } from '@/components/nodes/azure/AzureSubnetNode';
import { AzureVmNode } from '@/components/nodes/azure/AzureVmNode';
import { AzureNsgNode } from '@/components/nodes/azure/AzureNsgNode';
import { AzurePipNode } from '@/components/nodes/azure/AzurePipNode';
import { AzureStorageNode } from '@/components/nodes/azure/AzureStorageNode';
import { AzureSqlNode } from '@/components/nodes/azure/AzureSqlNode';
import { AzureFunctionNode } from '@/components/nodes/azure/AzureFunctionNode';
import { AzureLbNode } from '@/components/nodes/azure/AzureLbNode';
import { AzureNatNode } from '@/components/nodes/azure/AzureNatNode';
import { AzureRouteTableNode } from '@/components/nodes/azure/AzureRouteTableNode';
import { GenericNode } from '@/components/nodes/GenericNode';
import {
  AzureVnetIcon, AzureSubnetIcon, AzureVmIcon, AzureNsgIcon,
  AzurePipIcon, AzureStorageIcon, AzureSqlIcon, AzureFunctionIcon,
  AzureLbIcon,
} from '@/components/nodes/icons/AzureIcons';

export const azureFrontendConfig: ProviderFrontendConfig = {
  nodeTypes: {
    vpcNode: AzureVnetNode,
    subnetNode: AzureSubnetNode,
    ec2Node: AzureVmNode,
    securityGroupNode: AzureNsgNode,
    eipNode: AzurePipNode,
    s3Node: AzureStorageNode,
    rdsNode: AzureSqlNode,
    lambdaNode: AzureFunctionNode,
    lbNode: AzureLbNode,
    natNode: AzureNatNode,
    routeTableNode: AzureRouteTableNode,
    genericNode: GenericNode,
  },

  minimapColors: {
    vpcNode: '#107C10',
    subnetNode: '#0078D4',
    ec2Node: '#0078D4',
    securityGroupNode: '#D13438',
    eipNode: '#0078D4',
    s3Node: '#008272',
    rdsNode: '#0F4C75',
    lambdaNode: '#0078D4',
    lbNode: '#773ADC',
    natNode: '#773ADC',
    routeTableNode: '#773ADC',
  },

  edgeColors: {
    'secured by': '#D13438',
    'depends on': '#0F4C75',
    'in vnet': '#107C10',
    'in subnet': '#0078D4',
    'uses pip': '#0078D4',
    'in rg': '#64748b',
    'attached to': '#64748b',
    'behind lb': '#773ADC',
  },

  typeMeta: {
    azurerm_virtual_network:      { label: 'Virtual Network',        color: '#107C10', Icon: AzureVnetIcon },
    azurerm_subnet:               { label: 'Subnet',                 color: '#0078D4', Icon: AzureSubnetIcon },
    azurerm_network_security_group: { label: 'Network Security Group', color: '#D13438', Icon: AzureNsgIcon },
    azurerm_public_ip:            { label: 'Public IP',              color: '#0078D4', Icon: AzurePipIcon },
    azurerm_virtual_machine:      { label: 'Virtual Machine',        color: '#0078D4', Icon: AzureVmIcon },
    azurerm_linux_virtual_machine: { label: 'Linux VM',              color: '#0078D4', Icon: AzureVmIcon },
    azurerm_windows_virtual_machine: { label: 'Windows VM',          color: '#0078D4', Icon: AzureVmIcon },
    azurerm_storage_account:      { label: 'Storage Account',        color: '#008272', Icon: AzureStorageIcon },
    azurerm_sql_server:           { label: 'SQL Server',             color: '#0F4C75', Icon: AzureSqlIcon },
    azurerm_sql_database:         { label: 'SQL Database',           color: '#0F4C75', Icon: AzureSqlIcon },
    azurerm_function_app:         { label: 'Function App',           color: '#0078D4', Icon: AzureFunctionIcon },
    azurerm_lb:                   { label: 'Load Balancer',          color: '#773ADC', Icon: AzureLbIcon },
    azurerm_application_gateway:  { label: 'App Gateway',            color: '#773ADC', Icon: AzureLbIcon },
    azurerm_kubernetes_cluster:   { label: 'AKS Cluster',            color: '#0078D4', Icon: AzureVmIcon },
  },

  interestingAttrs: {
    azurerm_virtual_network:       ['address_space', 'location'],
    azurerm_subnet:                ['address_prefix'],
    azurerm_network_security_group: ['location'],
    azurerm_public_ip:             ['ip_address', 'allocation_method'],
    azurerm_linux_virtual_machine: ['vm_size', 'location'],
    azurerm_windows_virtual_machine: ['vm_size', 'location'],
    azurerm_virtual_machine:       ['vm_size', 'location'],
    azurerm_storage_account:       ['account_tier', 'account_replication_type', 'location'],
    azurerm_sql_server:            ['version', 'location'],
    azurerm_sql_database:          ['edition'],
    azurerm_function_app:          ['runtime', 'location'],
    azurerm_lb:                    ['sku', 'location'],
    azurerm_kubernetes_cluster:    ['kubernetes_version', 'dns_prefix', 'location'],
  },

  typeConfig: {
    azurerm_virtual_network:       { label: 'VNet',     Icon: AzureVnetIcon },
    azurerm_subnet:                { label: 'Subnet',   Icon: AzureSubnetIcon },
    azurerm_network_security_group: { label: 'NSG',     Icon: AzureNsgIcon },
    azurerm_public_ip:             { label: 'PIP',      Icon: AzurePipIcon },
    azurerm_linux_virtual_machine: { label: 'VM',       Icon: AzureVmIcon },
    azurerm_windows_virtual_machine: { label: 'VM',     Icon: AzureVmIcon },
    azurerm_virtual_machine:       { label: 'VM',       Icon: AzureVmIcon },
    azurerm_storage_account:       { label: 'Storage',  Icon: AzureStorageIcon },
    azurerm_sql_server:            { label: 'SQL',      Icon: AzureSqlIcon },
    azurerm_sql_database:          { label: 'SQL DB',   Icon: AzureSqlIcon },
    azurerm_function_app:          { label: 'Func',     Icon: AzureFunctionIcon },
    azurerm_lb:                    { label: 'LB',       Icon: AzureLbIcon },
    azurerm_application_gateway:   { label: 'AppGW',    Icon: AzureLbIcon },
    azurerm_kubernetes_cluster:    { label: 'AKS',      Icon: AzureVmIcon },
  },

  minimapNodeColor(node: Node): string {
    return azureFrontendConfig.minimapColors[node.type ?? ''] ?? '#7B8794';
  },
};
