export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'InfraGraph API',
    version: '4.0.0',
    description: 'Parse Terraform state files and return interactive graph data for multi-cloud infrastructure visualization.',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Local dev' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    version: { type: 'string', example: '1.0.0' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/parse': {
      post: {
        summary: 'Parse tfstate file (multipart upload)',
        tags: ['Parse'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  tfstate: {
                    type: 'string',
                    format: 'binary',
                    description: 'A .tfstate file',
                  },
                },
                required: ['tfstate'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Parsed graph', content: { 'application/json': { schema: { $ref: '#/components/schemas/ParseResponse' } } } },
          '400': { description: 'No file uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '422': { description: 'Parse error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/parse/raw': {
      post: {
        summary: 'Parse raw tfstate JSON',
        tags: ['Parse'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tfstate: { type: 'string', description: 'Raw .tfstate file content as JSON string' },
                },
                required: ['tfstate'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Parsed graph', content: { 'application/json': { schema: { $ref: '#/components/schemas/ParseResponse' } } } },
          '400': { description: 'Invalid request body', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '422': { description: 'Parse error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/github/token': {
      post: {
        summary: 'Exchange GitHub OAuth code for access token',
        tags: ['GitHub'],
        description: 'Exchanges a GitHub OAuth authorization code for an access token. Returns the token along with the authenticated user\'s username and avatar.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'OAuth authorization code from GitHub redirect' },
                },
                required: ['code'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Token exchanged', content: { 'application/json': { schema: { $ref: '#/components/schemas/GitHubTokenResponse' } } } },
          '400': { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '422': { description: 'Token exchange failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/github/repos': {
      get: {
        summary: 'List authenticated user\'s repositories',
        tags: ['GitHub'],
        description: 'Returns repositories for the authenticated GitHub user, sorted by most recently pushed. Includes private repos.',
        parameters: [
          {
            name: 'X-GitHub-Token',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'GitHub OAuth access token',
          },
        ],
        responses: {
          '200': {
            description: 'List of repositories',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GitHubRepo' } } } },
          },
          '401': { description: 'Missing token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '422': { description: 'Failed to list repos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/github/scan': {
      post: {
        summary: 'Scan a GitHub repo for Terraform projects',
        tags: ['GitHub'],
        description: 'Scans a GitHub repository for directories containing .tf files. Optionally pass X-GitHub-Token header for private repo access.',
        parameters: [
          {
            name: 'X-GitHub-Token',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'GitHub OAuth access token (optional, enables private repos)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  repoUrl: { type: 'string', example: 'https://github.com/owner/repo', description: 'GitHub repository URL' },
                },
                required: ['repoUrl'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Terraform projects found', content: { 'application/json': { schema: { $ref: '#/components/schemas/GitHubScanResponse' } } } },
          '400': { description: 'Invalid URL', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '404': { description: 'No Terraform projects found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '422': { description: 'Scan failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/github/parse': {
      post: {
        summary: 'Parse a Terraform project from a GitHub repo',
        tags: ['GitHub'],
        description: 'Fetches .tf files from a specific project directory in a GitHub repo, parses HCL, and returns graph data. Optionally pass X-GitHub-Token for private repo access.',
        parameters: [
          {
            name: 'X-GitHub-Token',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'GitHub OAuth access token (optional, enables private repos)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  repoUrl: { type: 'string', example: 'https://github.com/owner/repo' },
                  projectPath: { type: 'string', example: '03-aws-s3-bucket', description: 'Directory path containing .tf files' },
                },
                required: ['repoUrl', 'projectPath'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Parsed graph', content: { 'application/json': { schema: { $ref: '#/components/schemas/ParseResponse' } } } },
          '400': { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '422': { description: 'Parse failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
  components: {
    schemas: {
      ParseResponse: {
        type: 'object',
        properties: {
          nodes: { type: 'array', items: { $ref: '#/components/schemas/GraphNode' } },
          edges: { type: 'array', items: { $ref: '#/components/schemas/GraphEdge' } },
          resources: { type: 'array', items: { $ref: '#/components/schemas/AwsResource' } },
          provider: { type: 'string', enum: ['aws', 'azure', 'gcp'], example: 'aws' },
          warnings: { type: 'array', items: { type: 'string' } },
        },
      },
      GraphNode: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'aws_vpc.main' },
          type: { type: 'string', example: 'vpcNode' },
          position: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
          },
          data: { type: 'object' },
          parentNode: { type: 'string' },
          extent: { type: 'string' },
          style: { type: 'object' },
        },
      },
      GraphEdge: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'e-aws_instance.web-aws_vpc.main' },
          source: { type: 'string' },
          target: { type: 'string' },
          label: { type: 'string' },
          animated: { type: 'boolean' },
        },
      },
      AwsResource: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'aws_vpc.main' },
          type: { type: 'string', example: 'aws_vpc' },
          name: { type: 'string' },
          displayName: { type: 'string' },
          attributes: { type: 'object' },
          dependencies: { type: 'array', items: { type: 'string' } },
          region: { type: 'string' },
          tags: { type: 'object' },
        },
      },
      GitHubTokenResponse: {
        type: 'object',
        properties: {
          access_token: { type: 'string', description: 'GitHub OAuth access token' },
          username: { type: 'string', example: 'octocat' },
          avatar_url: { type: 'string', example: 'https://avatars.githubusercontent.com/u/1?v=4' },
        },
      },
      GitHubRepo: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'my-terraform-repo' },
          full_name: { type: 'string', example: 'octocat/my-terraform-repo' },
          description: { type: 'string', nullable: true },
          private: { type: 'boolean' },
          pushed_at: { type: 'string', format: 'date-time' },
          default_branch: { type: 'string', example: 'main' },
          html_url: { type: 'string', example: 'https://github.com/octocat/my-terraform-repo' },
        },
      },
      GitHubScanResponse: {
        type: 'object',
        properties: {
          owner: { type: 'string', example: 'octocat' },
          repo: { type: 'string', example: 'my-terraform-repo' },
          defaultBranch: { type: 'string', example: 'main' },
          projects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', example: '03-aws-s3-bucket' },
                files: { type: 'array', items: { type: 'string' }, example: ['main.tf', 'variables.tf'] },
                resourceCount: { type: 'number' },
              },
            },
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' },
        },
      },
    },
  },
};
