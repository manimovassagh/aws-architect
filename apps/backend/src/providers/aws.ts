import type { ProviderConfig } from '@infragraph/shared';

export const awsProvider: ProviderConfig = {
  id: 'aws',
  name: 'Amazon Web Services',
  shortName: 'AWS',
  resourcePrefix: 'aws_',

  supportedTypes: new Set([
    'aws_vpc',
    'aws_subnet',
    'aws_internet_gateway',
    'aws_nat_gateway',
    'aws_route_table',
    'aws_route_table_association',
    'aws_security_group',
    'aws_instance',
    'aws_db_instance',
    'aws_lb',
    'aws_alb',
    'aws_lb_target_group',
    'aws_lb_listener',
    'aws_eip',
    'aws_s3_bucket',
    'aws_lambda_function',
    'aws_ecs_cluster',
    'aws_ecs_service',
    'aws_ecs_task_definition',
    'aws_eks_cluster',
    'aws_elasticache_cluster',
    'aws_sqs_queue',
    'aws_sns_topic',
    'aws_cloudfront_distribution',
    'aws_api_gateway_rest_api',
  ]),

  edgeAttributes: [
    ['vpc_id', 'in vpc'],
    ['subnet_id', 'in subnet'],
    ['security_groups', 'secured by'],
    ['vpc_security_group_ids', 'secured by'],
    ['nat_gateway_id', 'routes via'],
    ['internet_gateway_id', 'routes via'],
    ['instance_id', 'attached to'],
    ['allocation_id', 'uses eip'],
    ['load_balancer_arn', 'behind lb'],
  ],

  containerTypes: [
    { type: 'aws_vpc', parentAttr: 'vpc_id', nodeType: 'vpcNode' },
    { type: 'aws_subnet', parentAttr: 'subnet_id', nodeType: 'subnetNode' },
  ],

  nodeTypeMapping: {
    aws_vpc: 'vpcNode',
    aws_subnet: 'subnetNode',
    aws_internet_gateway: 'igwNode',
    aws_nat_gateway: 'natNode',
    aws_route_table: 'routeTableNode',
    aws_route_table_association: 'routeTableNode',
    aws_security_group: 'securityGroupNode',
    aws_instance: 'ec2Node',
    aws_db_instance: 'rdsNode',
    aws_lb: 'lbNode',
    aws_alb: 'lbNode',
    aws_eip: 'eipNode',
    aws_s3_bucket: 's3Node',
    aws_lambda_function: 'lambdaNode',
  },

  extractRegion(attrs: Record<string, unknown>): string | undefined {
    const arn = attrs['arn'];
    if (typeof arn === 'string') {
      const parts = arn.split(':');
      if (parts.length >= 4 && parts[3]) return parts[3];
    }
    return undefined;
  },

  refPattern: /^(aws_\w+)\.(\w+)(?:\.\w+)?$/,
};
