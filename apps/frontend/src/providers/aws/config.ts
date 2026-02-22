import type { Node } from 'reactflow';
import type { ProviderFrontendConfig } from '../types';

import { VpcNode } from '@/components/nodes/VpcNode';
import { SubnetNode } from '@/components/nodes/SubnetNode';
import { Ec2Node } from '@/components/nodes/Ec2Node';
import { RdsNode } from '@/components/nodes/RdsNode';
import { S3Node } from '@/components/nodes/S3Node';
import { LambdaNode } from '@/components/nodes/LambdaNode';
import { LbNode } from '@/components/nodes/LbNode';
import { IgwNode } from '@/components/nodes/IgwNode';
import { NatNode } from '@/components/nodes/NatNode';
import { RouteTableNode } from '@/components/nodes/RouteTableNode';
import { SecurityGroupNode } from '@/components/nodes/SecurityGroupNode';
import { EipNode } from '@/components/nodes/EipNode';
import { GenericNode } from '@/components/nodes/GenericNode';
import {
  Ec2Icon, RdsIcon, S3Icon, LambdaIcon, LbIcon, VpcIcon,
  SubnetIcon, IgwIcon, NatIcon, SecurityGroupIcon, EipIcon,
  RouteTableIcon,
} from '@/components/nodes/icons/AwsIcons';

export const awsFrontendConfig: ProviderFrontendConfig = {
  nodeTypes: {
    vpcNode: VpcNode,
    subnetNode: SubnetNode,
    ec2Node: Ec2Node,
    rdsNode: RdsNode,
    s3Node: S3Node,
    lambdaNode: LambdaNode,
    lbNode: LbNode,
    igwNode: IgwNode,
    natNode: NatNode,
    routeTableNode: RouteTableNode,
    securityGroupNode: SecurityGroupNode,
    eipNode: EipNode,
    genericNode: GenericNode,
  },

  minimapColors: {
    vpcNode: '#1B660F',
    subnetNode: '#147EBA',
    ec2Node: '#ED7100',
    rdsNode: '#3B48CC',
    s3Node: '#3F8624',
    lambdaNode: '#ED7100',
    lbNode: '#8C4FFF',
    securityGroupNode: '#DD344C',
    igwNode: '#8C4FFF',
    natNode: '#8C4FFF',
    eipNode: '#ED7100',
    routeTableNode: '#8C4FFF',
  },

  edgeColors: {
    'secured by': '#DD344C',
    'depends on': '#3B48CC',
    'routes via': '#8C4FFF',
    'uses eip': '#ED7100',
    'attached to': '#64748b',
    'behind lb': '#8C4FFF',
  },

  typeMeta: {
    aws_vpc:                 { label: 'VPC',             color: '#1B660F', Icon: VpcIcon },
    aws_subnet:              { label: 'Subnet',          color: '#147EBA', Icon: SubnetIcon },
    aws_internet_gateway:    { label: 'Internet Gateway', color: '#8C4FFF', Icon: IgwIcon },
    aws_nat_gateway:         { label: 'NAT Gateway',     color: '#8C4FFF', Icon: NatIcon },
    aws_route_table:         { label: 'Route Table',     color: '#8C4FFF', Icon: RouteTableIcon },
    aws_security_group:      { label: 'Security Group',  color: '#DD344C', Icon: SecurityGroupIcon },
    aws_instance:            { label: 'EC2 Instance',    color: '#ED7100', Icon: Ec2Icon },
    aws_db_instance:         { label: 'RDS Database',    color: '#3B48CC', Icon: RdsIcon },
    aws_lb:                  { label: 'Load Balancer',   color: '#8C4FFF', Icon: LbIcon },
    aws_alb:                 { label: 'Load Balancer',   color: '#8C4FFF', Icon: LbIcon },
    aws_eip:                 { label: 'Elastic IP',      color: '#ED7100', Icon: EipIcon },
    aws_s3_bucket:           { label: 'S3 Bucket',       color: '#3F8624', Icon: S3Icon },
    aws_lambda_function:     { label: 'Lambda Function', color: '#ED7100', Icon: LambdaIcon },
  },

  interestingAttrs: {
    aws_vpc:              ['cidr_block', 'enable_dns_hostnames', 'enable_dns_support'],
    aws_subnet:           ['cidr_block', 'availability_zone', 'map_public_ip_on_launch'],
    aws_instance:         ['instance_type', 'ami', 'availability_zone', 'private_ip', 'public_ip'],
    aws_db_instance:      ['engine', 'engine_version', 'instance_class', 'allocated_storage', 'multi_az'],
    aws_lb:               ['load_balancer_type', 'scheme', 'dns_name'],
    aws_s3_bucket:        ['bucket', 'acl', 'versioning'],
    aws_security_group:   ['description'],
    aws_eip:              ['public_ip', 'allocation_id'],
    aws_nat_gateway:      ['connectivity_type'],
    aws_internet_gateway: [],
    aws_lambda_function:  ['runtime', 'handler', 'memory_size', 'timeout'],
  },

  typeConfig: {
    aws_vpc:              { label: 'VPC',    Icon: VpcIcon },
    aws_subnet:           { label: 'Subnet', Icon: SubnetIcon },
    aws_instance:         { label: 'EC2',    Icon: Ec2Icon },
    aws_db_instance:      { label: 'RDS',    Icon: RdsIcon },
    aws_lb:               { label: 'ALB',    Icon: LbIcon },
    aws_s3_bucket:        { label: 'S3',     Icon: S3Icon },
    aws_lambda_function:  { label: 'Lambda', Icon: LambdaIcon },
    aws_security_group:   { label: 'SG',     Icon: SecurityGroupIcon },
    aws_internet_gateway: { label: 'IGW',    Icon: IgwIcon },
    aws_nat_gateway:      { label: 'NAT',    Icon: NatIcon },
    aws_eip:              { label: 'EIP',    Icon: EipIcon },
  },

  minimapNodeColor(node: Node): string {
    return awsFrontendConfig.minimapColors[node.type ?? ''] ?? '#7B8794';
  },
};
