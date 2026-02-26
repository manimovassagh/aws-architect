import type { CloudResource } from '@infragraph/shared';

export interface CostEstimate {
  resourceId: string;
  resourceType: string;
  monthlyCost: number;
  label: string; // e.g. "t3.micro" or "db.t3.medium"
}

// ─── AWS Pricing (us-east-1 on-demand, approximate USD/month) ────────────────

const AWS_EC2_PRICING: Record<string, number> = {
  't2.nano': 4.18, 't2.micro': 8.35, 't2.small': 16.71, 't2.medium': 33.41,
  't2.large': 66.82, 't2.xlarge': 133.63, 't2.2xlarge': 267.26,
  't3.nano': 3.80, 't3.micro': 7.59, 't3.small': 15.18, 't3.medium': 30.37,
  't3.large': 60.74, 't3.xlarge': 121.47, 't3.2xlarge': 242.94,
  'm5.large': 69.12, 'm5.xlarge': 138.24, 'm5.2xlarge': 276.48, 'm5.4xlarge': 552.96,
  'm6i.large': 69.12, 'm6i.xlarge': 138.24, 'm6i.2xlarge': 276.48,
  'c5.large': 61.20, 'c5.xlarge': 122.40, 'c5.2xlarge': 244.80,
  'r5.large': 90.72, 'r5.xlarge': 181.44, 'r5.2xlarge': 362.88,
};

const AWS_RDS_PRICING: Record<string, number> = {
  'db.t3.micro': 12.41, 'db.t3.small': 24.82, 'db.t3.medium': 49.64,
  'db.t3.large': 99.28, 'db.t3.xlarge': 198.56, 'db.t3.2xlarge': 397.12,
  'db.m5.large': 124.10, 'db.m5.xlarge': 248.20, 'db.m5.2xlarge': 496.40,
  'db.r5.large': 175.20, 'db.r5.xlarge': 350.40, 'db.r5.2xlarge': 700.80,
};

const AWS_FIXED_COSTS: Record<string, number> = {
  aws_nat_gateway: 32.40,        // ~$0.045/hr
  aws_lb: 16.20,                 // ~$0.0225/hr (ALB)
  aws_alb: 16.20,
  aws_eip: 3.60,                 // ~$0.005/hr when unattached
  aws_internet_gateway: 0,       // Free
  aws_vpc: 0,                    // Free
  aws_subnet: 0,                 // Free
  aws_security_group: 0,         // Free
  aws_route_table: 0,            // Free
  aws_s3_bucket: 2.30,           // ~$0.023/GB, assume 100GB baseline
  aws_lambda_function: 0,        // Pay-per-invocation, can't estimate statically
};

// ─── Azure Pricing (approximate USD/month) ───────────────────────────────────

const AZURE_VM_PRICING: Record<string, number> = {
  'Standard_B1s': 7.59, 'Standard_B1ms': 15.18, 'Standard_B2s': 30.37,
  'Standard_B2ms': 60.74, 'Standard_D2s_v3': 70.08, 'Standard_D4s_v3': 140.16,
  'Standard_D2s_v5': 69.35, 'Standard_D4s_v5': 138.70,
};

const AZURE_FIXED_COSTS: Record<string, number> = {
  azurerm_virtual_network: 0,
  azurerm_subnet: 0,
  azurerm_network_security_group: 0,
  azurerm_public_ip: 3.60,
  azurerm_lb: 18.00,
  azurerm_storage_account: 5.00,  // Approximate baseline
  azurerm_sql_server: 0,          // Server itself is free, databases cost
  azurerm_sql_database: 15.00,    // Basic tier
  azurerm_mssql_server: 0,
  azurerm_mssql_database: 15.00,
};

// ─── GCP Pricing (approximate USD/month) ─────────────────────────────────────

const GCP_VM_PRICING: Record<string, number> = {
  'e2-micro': 6.11, 'e2-small': 12.23, 'e2-medium': 24.46,
  'n1-standard-1': 24.27, 'n1-standard-2': 48.55, 'n1-standard-4': 97.09,
  'n2-standard-2': 48.92, 'n2-standard-4': 97.83,
};

const GCP_FIXED_COSTS: Record<string, number> = {
  google_compute_network: 0,
  google_compute_subnetwork: 0,
  google_compute_firewall: 0,
  google_compute_address: 7.20,
  google_compute_router: 0,
  google_compute_router_nat: 32.40,
  google_storage_bucket: 2.30,
  google_sql_database_instance: 25.00, // Small instance baseline
};

// ─── Estimator ───────────────────────────────────────────────────────────────

function estimateAws(r: CloudResource): number | null {
  // EC2
  if (r.type === 'aws_instance') {
    const instanceType = r.attributes['instance_type'] as string | undefined;
    if (instanceType && AWS_EC2_PRICING[instanceType]) return AWS_EC2_PRICING[instanceType];
    if (instanceType) return 30; // Unknown instance type fallback
    return null;
  }
  // RDS
  if (r.type === 'aws_db_instance') {
    const instanceClass = r.attributes['instance_class'] as string | undefined;
    if (instanceClass && AWS_RDS_PRICING[instanceClass]) return AWS_RDS_PRICING[instanceClass];
    if (instanceClass) return 50; // Unknown class fallback
    return null;
  }
  // Fixed-cost resources
  if (r.type in AWS_FIXED_COSTS) return AWS_FIXED_COSTS[r.type];
  return null;
}

function estimateAzure(r: CloudResource): number | null {
  // VMs
  if (r.type.includes('virtual_machine')) {
    const size = r.attributes['size'] as string | undefined
      ?? r.attributes['vm_size'] as string | undefined;
    if (size && AZURE_VM_PRICING[size]) return AZURE_VM_PRICING[size];
    if (size) return 50;
    return null;
  }
  if (r.type in AZURE_FIXED_COSTS) return AZURE_FIXED_COSTS[r.type];
  return null;
}

function estimateGcp(r: CloudResource): number | null {
  // Compute instances
  if (r.type === 'google_compute_instance') {
    const machineType = r.attributes['machine_type'] as string | undefined;
    if (machineType) {
      // machine_type can be a full path like "zones/us-central1-a/machineTypes/e2-micro"
      const shortType = machineType.split('/').pop() ?? machineType;
      if (GCP_VM_PRICING[shortType]) return GCP_VM_PRICING[shortType];
      return 30;
    }
    return null;
  }
  if (r.type in GCP_FIXED_COSTS) return GCP_FIXED_COSTS[r.type];
  return null;
}

export function estimateCosts(resources: CloudResource[]): CostEstimate[] {
  const estimates: CostEstimate[] = [];

  for (const r of resources) {
    let cost: number | null = null;

    if (r.provider === 'aws') cost = estimateAws(r);
    else if (r.provider === 'azure') cost = estimateAzure(r);
    else if (r.provider === 'gcp') cost = estimateGcp(r);

    if (cost !== null && cost > 0) {
      const label =
        (r.attributes['instance_type'] as string) ??
        (r.attributes['instance_class'] as string) ??
        (r.attributes['size'] as string) ??
        (r.attributes['machine_type'] as string)?.split('/').pop() ??
        r.type.replace(/^(aws_|azurerm_|google_)/, '');

      estimates.push({
        resourceId: r.id,
        resourceType: r.type,
        monthlyCost: cost,
        label,
      });
    }
  }

  return estimates;
}

export function formatCost(cost: number): string {
  if (cost >= 1000) return `$${(cost / 1000).toFixed(1)}k`;
  if (cost >= 100) return `$${Math.round(cost)}`;
  if (cost >= 10) return `$${cost.toFixed(1)}`;
  return `$${cost.toFixed(2)}`;
}

export function totalMonthlyCost(estimates: CostEstimate[]): number {
  return estimates.reduce((sum, e) => sum + e.monthlyCost, 0);
}
