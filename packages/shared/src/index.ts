// ─── Cloud Provider ──────────────────────────────────────────────────────────

export type CloudProvider = 'aws' | 'azure' | 'gcp';

// ─── IaC Source ──────────────────────────────────────────────────────────────

/** Which Infrastructure-as-Code tool produced the parse input */
export type IacSource = 'terraform-state' | 'terraform-hcl' | 'cloudformation' | 'cdk' | 'terraform-plan';

// ─── Plan Action ────────────────────────────────────────────────────────────

/** Terraform plan change action for a resource */
export type PlanAction = 'create' | 'update' | 'delete' | 'replace' | 'no-op' | 'read';

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
  /** Resource type identifier (Terraform type like "aws_vpc" or normalized CFN type) */
  type: string;
  /** Resource name (Terraform label or CloudFormation logical ID) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** All attributes (from tfstate values, HCL properties, or CFN properties) */
  attributes: Record<string, unknown>;
  /** IDs of other resources this resource depends on */
  dependencies: string[];
  /** Cloud provider this resource belongs to */
  provider: CloudProvider;
  /** Cloud region if determinable */
  region?: string;
  /** Tags extracted from attributes */
  tags: Record<string, string>;
  /** Attribute keys that contain sensitive values (passwords, secrets, etc.) */
  sensitiveKeys?: string[];
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
  /** Terraform plan change action (only present for plan visualization) */
  planAction?: PlanAction;
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

export interface ParseResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  resources: CloudResource[];
  /** Cloud provider detected or specified */
  provider: CloudProvider;
  /** Parsing warnings (non-fatal issues) */
  warnings: string[];
  /** Which IaC tool produced this result */
  iacSource: IacSource;
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
  /** Sensitive attribute paths — e.g. [["password"], ["private_key"]] */
  sensitive_attributes?: unknown[][];
}

export interface Tfstate {
  version: number;
  terraform_version: string;
  resources: TfstateResource[];
}

// ─── User & Session Models ───────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  sessionLimit: number;
}

export interface Session {
  id: string;
  userId: string;
  provider: CloudProvider;
  fileName: string;
  resourceCount: number;
  data: ParseResponse;
  createdAt: string;
}

/** Lightweight summary for list endpoints (no data blob). */
export type SessionSummary = Omit<Session, 'userId' | 'data'>;

export interface CreateSessionRequest {
  provider: CloudProvider;
  fileName: string;
  resourceCount: number;
  data: ParseResponse;
}

// ─── GitHub Connect ─────────────────────────────────────────────────────────

export interface GitHubTerraformProject {
  /** Directory path relative to repo root (e.g. "03-aws-s3-bucket") */
  path: string;
  /** List of .tf file names in this directory */
  files: string[];
  /** Number of resource blocks detected (quick scan) */
  resourceCount: number;
}

export interface GitHubScanRequest {
  repoUrl: string;
}

export interface GitHubScanResponse {
  owner: string;
  repo: string;
  defaultBranch: string;
  projects: GitHubTerraformProject[];
}

export interface GitHubParseRequest {
  repoUrl: string;
  projectPath: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  pushed_at: string;
  default_branch: string;
  html_url: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  username: string;
  avatar_url: string;
}

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  resources?: CloudResource[];
  model?: string;
  stream?: boolean;
}

export interface AiChatResponse {
  message: AiChatMessage;
  model: string;
  durationMs: number;
}

export interface AiStatusResponse {
  available: boolean;
  model: string;
  modelLoaded: boolean;
  error?: string;
}

export interface AiModelInfo {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface AiModelsResponse {
  models: AiModelInfo[];
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
