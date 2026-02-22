export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'InfraGraph API',
    version: '1.0.0',
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
  },
  components: {
    schemas: {
      ParseResponse: {
        type: 'object',
        properties: {
          nodes: { type: 'array', items: { $ref: '#/components/schemas/GraphNode' } },
          edges: { type: 'array', items: { $ref: '#/components/schemas/GraphEdge' } },
          resources: { type: 'array', items: { $ref: '#/components/schemas/AwsResource' } },
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
