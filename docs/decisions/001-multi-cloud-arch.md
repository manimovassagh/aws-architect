# ADR 001: Multi-Cloud Architecture

## Status

Accepted

## Context

InfraGraph started as an AWS-only Terraform state visualizer. Users requested support for Azure and GCP. We needed an architecture that:

- Supports multiple cloud providers without duplicating core logic
- Allows adding new providers with minimal changes to existing code
- Keeps provider-specific rendering separate for maintainability

## Decision

We adopted a **provider-config-driven architecture** with three layers:

### 1. Backend: `ProviderConfig`

Each cloud provider defines a config object (`aws.ts`, `azure.ts`, `gcp.ts`) that maps Terraform resource types to generic capability keys:

```
azurerm_virtual_network  -> vpcNode
google_compute_instance  -> ec2Node
aws_s3_bucket            -> s3Node
```

The parser is provider-agnostic — it reads the config and builds the React Flow graph using these generic keys.

### 2. Shared: `CloudProvider` type

The `@infragraph/shared` package exports `CloudProvider = 'aws' | 'azure' | 'gcp'` and all shared TypeScript interfaces.

### 3. Frontend: `ProviderFrontendConfig`

Each provider registers its own `ProviderFrontendConfig` with:

- `nodeTypes` — maps generic keys to provider-specific React components
- `typeMeta` — labels, colors, and icons per Terraform resource type
- `interestingAttrs` — which attributes to display per resource type
- `minimapColors` / `edgeColors` — visual theming
- `typeConfig` — resource summary bar configuration

### Auto-Detection

The backend auto-detects the cloud provider from resource type prefixes (`aws_`, `azurerm_`, `google_`). The frontend also accepts an explicit `?provider=` query parameter.

## Consequences

- Adding a new provider requires: 1 backend config, 1 frontend config, node components, and icons
- No changes to the parser, canvas, or shared infrastructure
- Each provider's visual identity is fully independent (colors, icons, labels)
- The generic key system (`ec2Node`, `s3Node`) means the backend and frontend share a contract without sharing provider-specific names
