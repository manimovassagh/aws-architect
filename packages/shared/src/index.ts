// ─── Cloud Provider ──────────────────────────────────────────────────────────

export type CloudProvider = 'aws' | 'azure' | 'gcp';

// ─── AWS Resource Types ───────────────────────────────────────────────────────

export type AwsResourceType =
  | 'aws_vpc'
  | 'aws_subnet'
  | 'aws_internet_gateway'
  | 'aws_nat_gateway'
  | 'aws_route_table'
  | 'aws_route_table_association'
  | 'aws_security_group'
  | 'aws_instance'
  | 'aws_db_instance'
  | 'aws_lb'
  | 'aws_alb'
  | 'aws_lb_target_group'
  | 'aws_lb_listener'
  | 'aws_eip'
  | 'aws_s3_bucket'
  | 'aws_lambda_function'
  | 'aws_ecs_cluster'
  | 'aws_ecs_service'
  | 'aws_ecs_task_definition'
  | 'aws_eks_cluster'
  | 'aws_elasticache_cluster'
  | 'aws_sqs_queue'
  | 'aws_sns_topic'
  | 'aws_cloudfront_distribution'
  | 'aws_api_gateway_rest_api'
  | (string & {});

// ─── Generic Cloud Resource Model ────────────────────────────────────────────

export interface CloudResource {
  /** Unique ID within the graph — e.g. "aws_vpc.main" or "azurerm_virtual_network.main" */
  id: string;
  /** Terraform resource type */
  type: string;
  /** Terraform resource name (the label after the type) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** All attributes from tfstate values block */
  attributes: Record<string, unknown>;
  /** IDs of other resources this resource depends on */
  dependencies: string[];
  /** Cloud provider this resource belongs to */
  provider: CloudProvider;
  /** Cloud region if determinable */
  region?: string;
  /** Tags extracted from attributes */
  tags: Record<string, string>;
}

// ─── AWS-specific Resource ───────────────────────────────────────────────────

export interface AwsResource extends CloudResource {
  provider: 'aws';
  type: AwsResourceType;
}

// ─── Graph Model (React Flow compatible) ─────────────────────────────────────

export type NodeType =
  | 'vpcNode'
  | 'subnetNode'
  | 'igwNode'
  | 'natNode'
  | 'routeTableNode'
  | 'securityGroupNode'
  | 'ec2Node'
  | 'rdsNode'
  | 'lbNode'
  | 'eipNode'
  | 's3Node'
  | 'lambdaNode'
  | 'genericNode'
  | (string & {});

export interface GraphNodeData {
  resource: CloudResource;
  label: string;
  /** IDs of child nodes (for VPC → subnet → resource grouping) */
  children?: string[];
}

export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: GraphNodeData;
  /** Parent node ID for grouped layout */
  parentNode?: string;
  extent?: 'parent';
  style?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** Relationship type for styling */
  label?: string;
  animated?: boolean;
  type?: string;
}

// ─── API Contracts ────────────────────────────────────────────────────────────

export interface ParseRequest {
  /** Raw .tfstate file content as string */
  tfstate: string;
}

export interface ParseResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  resources: CloudResource[];
  /** Cloud provider detected or specified */
  provider: CloudProvider;
  /** Parsing warnings (non-fatal issues) */
  warnings: string[];
}

export interface ApiError {
  error: string;
  details?: string;
}

// ─── tfstate JSON shape (partial — only what we read) ────────────────────────

export interface TfstateResource {
  mode: 'managed' | 'data';
  type: string;
  name: string;
  provider: string;
  instances: TfstateInstance[];
}

export interface TfstateInstance {
  schema_version: number;
  attributes: Record<string, unknown>;
  dependencies?: string[];
}

export interface Tfstate {
  version: number;
  terraform_version: string;
  resources: TfstateResource[];
}

// ─── Provider Configuration (contract each provider implements) ──────────────

export interface ContainerTypeConfig {
  /** Resource type that acts as a container (e.g. "aws_vpc") */
  type: string;
  /** Attribute on child resources that references this container (e.g. "vpc_id") */
  parentAttr: string;
  /** Node type for rendering this container */
  nodeType: string;
}

export interface ProviderConfig {
  /** Provider identifier */
  id: CloudProvider;
  /** Full display name (e.g. "Amazon Web Services") */
  name: string;
  /** Short name (e.g. "AWS") */
  shortName: string;
  /** Resource type prefix (e.g. "aws_") */
  resourcePrefix: string;
  /** Set of supported resource types */
  supportedTypes: Set<string>;
  /** Attribute keys that encode relationships → edge label */
  edgeAttributes: [string, string][];
  /** Container types with nesting hierarchy (ordered: outermost first) */
  containerTypes: ContainerTypeConfig[];
  /** Maps resource type → node type for rendering */
  nodeTypeMapping: Record<string, string>;
  /** Extract region from resource attributes */
  extractRegion: (attrs: Record<string, unknown>) => string | undefined;
  /** Regex pattern for resolving Terraform references (e.g. aws_\w+ or azurerm_\w+) */
  refPattern: RegExp;
}
