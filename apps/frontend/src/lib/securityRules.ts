import type { CloudResource, GraphEdge } from '@infragraph/shared';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecurityFinding {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  severity: Severity;
  title: string;
  description: string;
}

interface SecurityRule {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  appliesTo: (r: CloudResource) => boolean;
  check: (r: CloudResource, ctx: RuleContext) => boolean; // true = finding (violation)
}

interface RuleContext {
  resources: CloudResource[];
  edges: GraphEdge[];
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function attr(r: CloudResource, key: string): unknown {
  return r.attributes[key];
}

function attrBool(r: CloudResource, key: string): boolean | undefined {
  const v = r.attributes[key];
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

function attrStr(r: CloudResource, key: string): string {
  const v = r.attributes[key];
  return typeof v === 'string' ? v : '';
}

// ─── AWS Rules ──────────────────────────────────────────────────────────────

const awsRules: SecurityRule[] = [
  {
    id: 'aws-s3-no-versioning',
    title: 'S3 bucket versioning not enabled',
    severity: 'medium',
    description: 'Enable versioning to protect against accidental deletions and overwrites.',
    appliesTo: (r) => r.type === 'aws_s3_bucket',
    check: (r) => {
      const v = attr(r, 'versioning');
      if (Array.isArray(v) && v.length > 0) return !v[0]?.enabled;
      return attrBool(r, 'versioning') !== true;
    },
  },
  {
    id: 'aws-s3-no-encryption',
    title: 'S3 bucket server-side encryption not configured',
    severity: 'high',
    description: 'Enable default encryption (SSE-S3 or SSE-KMS) for data at rest.',
    appliesTo: (r) => r.type === 'aws_s3_bucket',
    check: (r) => {
      const enc = attr(r, 'server_side_encryption_configuration');
      return !enc || (Array.isArray(enc) && enc.length === 0);
    },
  },
  {
    id: 'aws-s3-no-public-access-block',
    title: 'S3 bucket missing public access block',
    severity: 'high',
    description: 'Block all public access to prevent unintended data exposure.',
    appliesTo: (r) => r.type === 'aws_s3_bucket',
    check: (r) => {
      return (
        attrBool(r, 'block_public_acls') !== true &&
        attrBool(r, 'block_public_policy') !== true &&
        !attr(r, 'public_access_block_configuration')
      );
    },
  },
  {
    id: 'aws-rds-publicly-accessible',
    title: 'RDS instance is publicly accessible',
    severity: 'critical',
    description: 'Database should not be accessible from the public internet.',
    appliesTo: (r) => r.type === 'aws_db_instance',
    check: (r) => attrBool(r, 'publicly_accessible') === true,
  },
  {
    id: 'aws-rds-no-encryption',
    title: 'RDS instance storage not encrypted',
    severity: 'high',
    description: 'Enable storage encryption for data at rest protection.',
    appliesTo: (r) => r.type === 'aws_db_instance',
    check: (r) => attrBool(r, 'storage_encrypted') !== true,
  },
  {
    id: 'aws-rds-no-multi-az',
    title: 'RDS instance not Multi-AZ',
    severity: 'medium',
    description: 'Enable Multi-AZ for high availability and automatic failover.',
    appliesTo: (r) => r.type === 'aws_db_instance',
    check: (r) => attrBool(r, 'multi_az') !== true,
  },
  {
    id: 'aws-rds-no-iam-auth',
    title: 'RDS IAM authentication not enabled',
    severity: 'low',
    description: 'Enable IAM database authentication for token-based access control.',
    appliesTo: (r) => r.type === 'aws_db_instance',
    check: (r) => attrBool(r, 'iam_database_authentication_enabled') !== true,
  },
  {
    id: 'aws-subnet-public-ip',
    title: 'Subnet auto-assigns public IPs',
    severity: 'medium',
    description: 'Instances in this subnet get public IPs by default — ensure this is intentional.',
    appliesTo: (r) => r.type === 'aws_subnet',
    check: (r) => attrBool(r, 'map_public_ip_on_launch') === true,
  },
  {
    id: 'aws-ec2-public-ip',
    title: 'EC2 instance has a public IP',
    severity: 'medium',
    description: 'Consider using a load balancer or NAT instead of direct public access.',
    appliesTo: (r) => r.type === 'aws_instance',
    check: (r) => {
      const pip = attrStr(r, 'public_ip');
      return pip !== '' && pip !== '0.0.0.0';
    },
  },
  {
    id: 'aws-ec2-no-monitoring',
    title: 'EC2 detailed monitoring not enabled',
    severity: 'low',
    description: 'Enable detailed monitoring for 1-minute CloudWatch metrics.',
    appliesTo: (r) => r.type === 'aws_instance',
    check: (r) => attrBool(r, 'monitoring') !== true,
  },
  {
    id: 'aws-sg-no-description',
    title: 'Security group has no meaningful description',
    severity: 'info',
    description: 'Add a descriptive name to help with auditing and incident response.',
    appliesTo: (r) => r.type === 'aws_security_group',
    check: (r) => {
      const desc = attrStr(r, 'description');
      return !desc || desc === 'Managed by Terraform' || desc.length < 5;
    },
  },
  {
    id: 'aws-lb-not-internal',
    title: 'Load balancer is internet-facing',
    severity: 'info',
    description: 'This LB is publicly accessible. Ensure WAF or security group rules restrict traffic.',
    appliesTo: (r) => r.type === 'aws_lb' || r.type === 'aws_alb',
    check: (r) => attrStr(r, 'scheme') !== 'internal',
  },
  {
    id: 'aws-vpc-no-flow-logs',
    title: 'VPC flow logs not detected',
    severity: 'medium',
    description: 'Enable VPC flow logs for network traffic visibility and auditing.',
    appliesTo: (r) => r.type === 'aws_vpc',
    check: (_r, ctx) => {
      return !ctx.resources.some((r2) => r2.type === 'aws_flow_log');
    },
  },
];

// ─── Azure Rules ────────────────────────────────────────────────────────────

const azureRules: SecurityRule[] = [
  {
    id: 'azure-storage-no-https',
    title: 'Storage account does not enforce HTTPS',
    severity: 'high',
    description: 'Enable HTTPS-only to encrypt data in transit.',
    appliesTo: (r) => r.type === 'azurerm_storage_account',
    check: (r) => attrBool(r, 'enable_https_traffic_only') === false,
  },
  {
    id: 'azure-storage-old-tls',
    title: 'Storage account allows TLS < 1.2',
    severity: 'high',
    description: 'Set minimum TLS version to 1.2 for strong encryption.',
    appliesTo: (r) => r.type === 'azurerm_storage_account',
    check: (r) => {
      const v = attrStr(r, 'min_tls_version');
      return v !== '' && v !== 'TLS1_2';
    },
  },
  {
    id: 'azure-sql-public-access',
    title: 'SQL server allows public network access',
    severity: 'critical',
    description: 'Disable public network access and use private endpoints.',
    appliesTo: (r) => r.type === 'azurerm_sql_server' || r.type === 'azurerm_mssql_server',
    check: (r) => attrBool(r, 'public_network_access_enabled') !== false,
  },
  {
    id: 'azure-vm-no-managed-identity',
    title: 'VM has no managed identity',
    severity: 'medium',
    description: 'Use managed identity instead of storing credentials for Azure service access.',
    appliesTo: (r) => r.type.includes('virtual_machine'),
    check: (r) => !attr(r, 'identity'),
  },
];

// ─── GCP Rules ──────────────────────────────────────────────────────────────

const gcpRules: SecurityRule[] = [
  {
    id: 'gcp-firewall-open-ssh',
    title: 'Firewall allows SSH from 0.0.0.0/0',
    severity: 'critical',
    description: 'Restrict SSH access to specific IP ranges.',
    appliesTo: (r) => r.type === 'google_compute_firewall',
    check: (r) => {
      const ranges = attr(r, 'source_ranges');
      if (Array.isArray(ranges)) return ranges.includes('0.0.0.0/0');
      return false;
    },
  },
  {
    id: 'gcp-sql-public-ip',
    title: 'Cloud SQL instance has a public IP',
    severity: 'high',
    description: 'Use private IP and Cloud SQL Proxy for secure database access.',
    appliesTo: (r) => r.type === 'google_sql_database_instance',
    check: (r) => {
      const settings = attr(r, 'settings') as Record<string, unknown>[] | undefined;
      if (Array.isArray(settings) && settings[0]) {
        const ipConfig = (settings[0] as Record<string, unknown>).ip_configuration;
        if (Array.isArray(ipConfig) && ipConfig[0]) {
          return (ipConfig[0] as Record<string, unknown>).ipv4_enabled === true;
        }
      }
      return attrBool(r, 'ipv4_enabled') === true;
    },
  },
  {
    id: 'gcp-sql-no-ssl',
    title: 'Cloud SQL does not require SSL',
    severity: 'high',
    description: 'Require SSL connections to encrypt data in transit.',
    appliesTo: (r) => r.type === 'google_sql_database_instance',
    check: (r) => attrBool(r, 'require_ssl') !== true,
  },
  {
    id: 'gcp-bucket-uniform-access',
    title: 'Storage bucket without uniform bucket-level access',
    severity: 'medium',
    description: 'Enable uniform bucket-level access for consistent IAM permissions.',
    appliesTo: (r) => r.type === 'google_storage_bucket',
    check: (r) => attrBool(r, 'uniform_bucket_level_access') !== true,
  },
];

// ─── Runner ─────────────────────────────────────────────────────────────────

const ALL_RULES: SecurityRule[] = [...awsRules, ...azureRules, ...gcpRules];

export function runSecurityScan(
  resources: CloudResource[],
  edges: GraphEdge[],
): SecurityFinding[] {
  const ctx: RuleContext = { resources, edges };
  const findings: SecurityFinding[] = [];

  for (const r of resources) {
    for (const rule of ALL_RULES) {
      if (!rule.appliesTo(r)) continue;
      if (rule.check(r, ctx)) {
        findings.push({
          id: `${rule.id}:${r.id}`,
          resourceId: r.id,
          resourceName: r.displayName,
          resourceType: r.type,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
        });
      }
    }
  }

  // Sort: critical first, then high, medium, low, info
  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return findings;
}

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; darkBg: string }> = {
  critical: { label: 'Critical', color: '#dc2626', bg: 'bg-red-50', darkBg: 'dark:bg-red-950/40' },
  high: { label: 'High', color: '#ea580c', bg: 'bg-orange-50', darkBg: 'dark:bg-orange-950/40' },
  medium: { label: 'Medium', color: '#d97706', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-950/40' },
  low: { label: 'Low', color: '#2563eb', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950/40' },
  info: { label: 'Info', color: '#6b7280', bg: 'bg-slate-50', darkBg: 'dark:bg-slate-800' },
};
