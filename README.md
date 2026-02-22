# InfraGraph

Visualize your Terraform infrastructure as interactive architecture diagrams. Upload `.tfstate` or `.tf` source files and get a live, zoomable canvas showing VPCs, subnets, and resources with their relationships.

![InfraGraph Provider Selection](docs/infragraph-landing.png)

![InfraGraph Canvas](docs/infragraph-canvas.png)

## Features

- **Multi-cloud ready** — AWS fully supported; Azure and GCP coming soon
- Parse Terraform state files (`.tfstate`) and HCL source files (`.tf`)
- Auto-layout: VPC > Subnet > Resource hierarchy with nested containers
- Interactive React Flow canvas with zoom, pan, minimap, and dark mode
- Click any node to inspect attributes, tags, and connections
- Export diagrams as PNG
- Search resources with keyboard shortcut (Cmd+K)
- Resource type badges with counts in the toolbar
- Sample infrastructure for quick demo
- Auto-detection of cloud provider from resource types
- Fully Dockerized with multi-stage builds

## Project Structure

```
infragraph/
├── apps/
│   ├── backend/           # Express API — parses tfstate/HCL, builds graph
│   │   ├── src/
│   │   │   ├── parser/    # tfstate, graph, and HCL parsers
│   │   │   ├── providers/ # Cloud provider configs (aws, azure, gcp)
│   │   │   └── routes/    # API route handlers
│   │   └── Dockerfile
│   └── frontend/          # Vite + React 18 — React Flow canvas + UI
│       ├── src/
│       │   ├── components/  # Canvas, nodes, panels, provider select
│       │   ├── providers/   # Frontend provider configs (aws, azure, gcp)
│       │   └── lib/         # API client, icons
│       └── Dockerfile
├── packages/
│   └── shared/            # Shared TypeScript types (CloudResource, GraphNode, etc.)
├── e2e/                   # Playwright end-to-end tests
├── test/
│   ├── fixtures/
│   │   ├── projects/      # 11 .tf source test projects
│   │   └── tfstate/       # 11 .tfstate test fixtures (simple → complex)
│   └── screenshots/
├── docker-compose.yml
└── Makefile
```

## Quick Start

```bash
# With Docker (recommended)
make up

# Without Docker
make install dev
```

Open http://localhost:3000, select a cloud provider, and upload a `.tfstate` or `.tf` file.

## Prerequisites

- **Docker** (recommended) — no other dependencies needed
- **Without Docker**: Node.js 20+, npm 10+

## Development

```bash
make install       # Install all dependencies
make dev           # Run backend (3001) + frontend (3000) concurrently
make dev-backend   # Run backend only
make dev-frontend  # Run frontend only
```

## Docker

```bash
make up            # Build and start all services
make down          # Stop and remove containers
make restart       # Full restart (down + clean + build + up)
make logs          # Tail container logs
make ps            # Show container status
```

## Testing

```bash
make test          # Run all tests (unit + smoke)
make test-unit     # Vitest unit tests with coverage
make test-e2e      # Playwright end-to-end tests
make lint          # ESLint across all workspaces
make typecheck     # TypeScript type checking
make check         # Run lint + typecheck + test (CI equivalent)
```

## API

All endpoints accept an optional `?provider=aws|azure|gcp` query parameter to override auto-detection.

### `POST /api/parse`

Upload a `.tfstate` file as multipart form data (field: `tfstate`).

### `POST /api/parse/raw`

Send raw tfstate JSON in the body: `{ "tfstate": "..." }`

### `POST /api/parse/hcl`

Upload one or more `.tf` files as multipart form data (field: `files`).

All endpoints return:

```ts
{
  nodes: GraphNode[];
  edges: GraphEdge[];
  resources: CloudResource[];
  provider: CloudProvider;
  warnings: string[];
}
```

### `GET /health`

Health check endpoint.

Swagger docs available at http://localhost:3001/docs.

## Supported Cloud Providers

| Provider | Status | Resource Types |
|----------|--------|----------------|
| **AWS** | Supported | VPC, Subnet, EC2, RDS, S3, Lambda, ECS, EKS, ALB, and 20+ more |
| **Azure** | Coming soon | VNet, VM, Storage, SQL, Functions, and more |
| **GCP** | Coming soon | VPC, Compute, Cloud SQL, GCS, Cloud Functions |

## Test Fixtures

The project includes 22 test fixtures covering diverse AWS architectures:

**`.tf` source projects** (`test/fixtures/projects/`):

| # | Project | Description |
|---|---------|-------------|
| 01 | static-site | CloudFront + S3 + Route53 + WAF |
| 02 | microservices | EKS cluster + RDS + Redis + ECR |
| 03 | data-lake | Glue + Kinesis + S3 zones + Athena |
| 04 | cicd-pipeline | CodePipeline + CodeBuild + ECR |
| 05 | monitoring | CloudWatch alarms + SNS + Firehose |
| 06 | multi-region | Active-active with Route53 failover |
| 07 | container-platform | ECS Fargate + ALB + Service Discovery |
| 08 | serverless-api | API Gateway + Lambda + DynamoDB + SQS |
| 09 | ml-pipeline | SageMaker + Step Functions + Lambda |
| 10 | network-hub | Transit Gateway + VPN + 3 VPCs |
| 11 | full-stack | Compute + Networking + Serverless combined |

**`.tfstate` files** (`test/fixtures/tfstate/`) — ordered simple to complex (6 → 16 resources).

## License

Apache-2.0 with Commons Clause
