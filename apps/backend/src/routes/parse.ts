import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { parseTfstate } from '../parser/tfstate.js';
import { buildGraph, buildGraphFromResources } from '../parser/graph.js';
import { parseHclFiles, extractResourcesFromParsedHcl } from '../parser/hcl.js';
import { parseCfnTemplate, extractResourcesFromCfn } from '../parser/cloudformation.js';
import { extractResourcesFromPlan, type TerraformPlan } from '../parser/plan.js';
import { detectProvider, detectProviderFromTypes, getProvider } from '../providers/index.js';
import type { CloudProvider, ParseResponse, ApiError, PlanAction } from '@infragraph/shared';

export const parseRouter = Router();

// multer stores file in memory — no disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.tfstate') || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only .tfstate files are accepted'));
    }
  },
});

/** Resolve provider from query param override or auto-detect from tfstate */
function resolveProviderParam(query: unknown): CloudProvider | undefined {
  if (typeof query === 'string' && ['aws', 'azure', 'gcp'].includes(query)) {
    return query as CloudProvider;
  }
  return undefined;
}

// POST /api/parse — multipart upload
parseRouter.post('/parse', upload.single('tfstate'), (req, res) => {
  try {
    if (!req.file) {
      const err: ApiError = { error: 'No file uploaded', details: 'Attach a .tfstate file as form field "tfstate"' };
      res.status(400).json(err);
      return;
    }

    const raw = req.file.buffer.toString('utf-8');
    const tfstate = parseTfstate(raw);

    // Provider: query param override or auto-detect
    const override = resolveProviderParam(req.query['provider']);
    const provider = override ? getProvider(override) : detectProvider(tfstate);

    const result = buildGraph(tfstate, provider);
    const response: ParseResponse = { ...result, iacSource: 'terraform-state' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse tfstate', details: message };
    res.status(422).json(apiErr);
  }
});

// POST /api/parse/raw — JSON body { tfstate: "..." }
const RawSchema = z.object({ tfstate: z.string().min(1) });

parseRouter.post('/parse/raw', (req, res) => {
  const result = RawSchema.safeParse(req.body);
  if (!result.success) {
    const err: ApiError = { error: 'Invalid request body', details: result.error.message };
    res.status(400).json(err);
    return;
  }

  try {
    const tfstate = parseTfstate(result.data.tfstate);
    const override = resolveProviderParam(req.query['provider']);
    const provider = override ? getProvider(override) : detectProvider(tfstate);

    const parseResult = buildGraph(tfstate, provider);
    const response: ParseResponse = { ...parseResult, iacSource: 'terraform-state' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse raw tfstate', details: message };
    res.status(422).json(apiErr);
  }
});

// ─── HCL upload ──────────────────────────────────────────────────────────────

const hclUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.tf')) {
      cb(null, true);
    } else {
      cb(new Error('Only .tf files are accepted'));
    }
  },
});

// POST /api/parse/hcl — multi-file upload of .tf files
parseRouter.post('/parse/hcl', hclUpload.array('files', 50), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      const err: ApiError = { error: 'No files uploaded', details: 'Attach one or more .tf files as form field "files"' };
      res.status(400).json(err);
      return;
    }

    const fileMap = new Map<string, string>();
    for (const f of files) {
      fileMap.set(f.originalname, f.buffer.toString('utf-8'));
    }

    // Parse HCL once, detect provider from resource types, then extract resources
    const override = resolveProviderParam(req.query['provider']);
    const { parsed, resourceTypes } = await parseHclFiles(fileMap);
    const provider = override ? getProvider(override) : detectProviderFromTypes(resourceTypes);

    const { resources, warnings } = extractResourcesFromParsedHcl(parsed, provider);
    const graphResult = buildGraphFromResources(resources, warnings, provider);
    const response: ParseResponse = { ...graphResult, iacSource: 'terraform-hcl' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse HCL', details: message };
    res.status(422).json(apiErr);
  }
});

// ─── CloudFormation upload ───────────────────────────────────────────────────

const cfnUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (name.endsWith('.json') || name.endsWith('.yaml') || name.endsWith('.yml') || name.endsWith('.template')) {
      cb(null, true);
    } else {
      cb(new Error('Only .json, .yaml, .yml, or .template files are accepted'));
    }
  },
});

// POST /api/parse/cfn — CloudFormation template file upload
parseRouter.post('/parse/cfn', cfnUpload.single('template'), (req, res) => {
  try {
    if (!req.file) {
      const err: ApiError = { error: 'No file uploaded', details: 'Attach a CloudFormation template as form field "template"' };
      res.status(400).json(err);
      return;
    }

    const raw = req.file.buffer.toString('utf-8');
    const template = parseCfnTemplate(raw);

    // CloudFormation currently only targets AWS
    const provider = getProvider('aws');
    const { resources, warnings } = extractResourcesFromCfn(template, provider);
    const graphResult = buildGraphFromResources(resources, warnings, provider);

    // Support ?source=cdk to mark as CDK origin
    const iacSource = req.query['source'] === 'cdk' ? 'cdk' as const : 'cloudformation' as const;
    const response: ParseResponse = { ...graphResult, iacSource };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse CloudFormation template', details: message };
    res.status(422).json(apiErr);
  }
});

// POST /api/parse/cfn/raw — JSON body { template: "..." }
const CfnRawSchema = z.object({ template: z.string().min(1) });

parseRouter.post('/parse/cfn/raw', (req, res) => {
  const result = CfnRawSchema.safeParse(req.body);
  if (!result.success) {
    const err: ApiError = { error: 'Invalid request body', details: result.error.message };
    res.status(400).json(err);
    return;
  }

  try {
    const template = parseCfnTemplate(result.data.template);
    const provider = getProvider('aws');
    const { resources, warnings } = extractResourcesFromCfn(template, provider);
    const graphResult = buildGraphFromResources(resources, warnings, provider);

    const iacSource = req.query['source'] === 'cdk' ? 'cdk' as const : 'cloudformation' as const;
    const response: ParseResponse = { ...graphResult, iacSource };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse CloudFormation template', details: message };
    res.status(422).json(apiErr);
  }
});

// ─── Terraform Plan ─────────────────────────────────────────────────────────

/** Inject planAction into each graph node's data from the actions map */
function injectPlanActions(response: ParseResponse, actions: Map<string, PlanAction>): ParseResponse {
  return {
    ...response,
    nodes: response.nodes.map((n) => ({
      ...n,
      data: { ...n.data, planAction: actions.get(n.id) },
    })),
  };
}

const planUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.json') || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON plan files are accepted'));
    }
  },
});

// POST /api/parse/plan — Terraform plan JSON file upload
parseRouter.post('/parse/plan', planUpload.single('plan'), (req, res) => {
  try {
    if (!req.file) {
      const err: ApiError = { error: 'No file uploaded', details: 'Attach a Terraform plan JSON as form field "plan"' };
      res.status(400).json(err);
      return;
    }

    const raw = req.file.buffer.toString('utf-8');
    const plan: TerraformPlan = JSON.parse(raw);

    if (!plan.resource_changes || !Array.isArray(plan.resource_changes)) {
      const err: ApiError = { error: 'Invalid plan format', details: 'Missing resource_changes array. Run: terraform show -json tfplan > plan.json' };
      res.status(400).json(err);
      return;
    }

    // Auto-detect provider from resource types in the plan
    const types = plan.resource_changes.map((rc) => rc.type);
    const override = resolveProviderParam(req.query['provider']);
    const provider = override ? getProvider(override) : detectProviderFromTypes(types);

    const { resources, actions, warnings } = extractResourcesFromPlan(plan, provider);
    const graphResult = buildGraphFromResources(resources, warnings, provider);
    const withActions = injectPlanActions(graphResult, actions);
    const response: ParseResponse = { ...withActions, iacSource: 'terraform-plan' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse Terraform plan', details: message };
    res.status(422).json(apiErr);
  }
});

// POST /api/parse/plan/raw — JSON body { plan: "..." }
const PlanRawSchema = z.object({ plan: z.string().min(1) });

parseRouter.post('/parse/plan/raw', (req, res) => {
  const result = PlanRawSchema.safeParse(req.body);
  if (!result.success) {
    const err: ApiError = { error: 'Invalid request body', details: result.error.message };
    res.status(400).json(err);
    return;
  }

  try {
    const plan: TerraformPlan = JSON.parse(result.data.plan);

    if (!plan.resource_changes || !Array.isArray(plan.resource_changes)) {
      const err: ApiError = { error: 'Invalid plan format', details: 'Missing resource_changes array' };
      res.status(400).json(err);
      return;
    }

    const types = plan.resource_changes.map((rc) => rc.type);
    const override = resolveProviderParam(req.query['provider']);
    const provider = override ? getProvider(override) : detectProviderFromTypes(types);

    const { resources, actions, warnings } = extractResourcesFromPlan(plan, provider);
    const graphResult = buildGraphFromResources(resources, warnings, provider);
    const withActions = injectPlanActions(graphResult, actions);
    const response: ParseResponse = { ...withActions, iacSource: 'terraform-plan' };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse Terraform plan', details: message };
    res.status(422).json(apiErr);
  }
});
