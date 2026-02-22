# ADR 002: Azure & GCP Provider Implementation

## Status

Accepted

## Context

With the multi-cloud architecture in place (ADR 001), we needed to implement full Azure and GCP support with visual parity to AWS.

## Decisions

### Shared Registry Keys

Backend node type keys are capability names, not brand names:

| Key | AWS | Azure | GCP |
|-----|-----|-------|-----|
| `vpcNode` | VPC | VNet | VPC Network |
| `subnetNode` | Subnet | Subnet | Subnetwork |
| `ec2Node` | EC2 Instance | Virtual Machine | Compute Instance |
| `securityGroupNode` | Security Group | NSG | Firewall Rule |
| `s3Node` | S3 Bucket | Storage Account | Cloud Storage |
| `rdsNode` | RDS | SQL Database | Cloud SQL |
| `lambdaNode` | Lambda | Function App | Cloud Function |
| `lbNode` | Load Balancer | Load Balancer | Forwarding Rule |

### Separate Node Components Per Provider

Each provider has its own directory of React components (`nodes/aws/`, `nodes/azure/`, `nodes/gcp/`). This allows:

- Provider-specific icons and color schemes
- Different attribute display logic (e.g., Azure VM reads `vm_size`, GCP Instance reads `machine_type`)
- Independent visual evolution without cross-provider regressions

### Color Palettes

**Azure** — follows Microsoft brand guidelines:
- VNet: `#107C10` (green), VM/PIP: `#0078D4` (blue), NSG: `#D13438` (red)
- Storage: `#008272` (teal), SQL: `#0F4C75` (dark blue), LB/NAT: `#773ADC` (purple)

**GCP** — follows Google Cloud brand colors:
- VPC: `#34A853` (green), Instance/Functions: `#FBBC04` (yellow), Firewall: `#EA4335` (red)
- Subnet: `#4285F4` (blue), SQL: `#0F9D58` (green), LB: `#AB47BC` (purple)

### Container Nesting

VPC and Subnet nodes are container types for all providers. The canvas renders them as dashed-border regions that visually contain child resources. This is config-driven via `containerTypes` in the backend config — no special casing per provider.

### Test Fixtures

Each provider has a sample `.tfstate` fixture with representative resources:
- AWS: `sample.tfstate` (~20 resources)
- Azure: `azure-sample.tfstate` (12 resources)
- GCP: `gcp-sample.tfstate` (11 resources)

These fixtures serve as both unit test data and "Try with sample infrastructure" demo data in the UI.

## Consequences

- All three providers have full visual parity: icons, node components, attribute display, container nesting, dependency edges
- E2E tests cover upload and rendering for each provider independently
- Adding more resource types to an existing provider only requires updating the backend config and (optionally) adding a new node component
