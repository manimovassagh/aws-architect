import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { parseTfstate } from '../parser/tfstate.js';
import { buildGraph, buildGraphFromResources } from '../parser/graph.js';
import { extractResourcesFromHcl } from '../parser/hcl.js';
import { detectProvider, detectProviderFromTypes, getProvider } from '../providers/index.js';
import type { CloudProvider, ParseResponse, ApiError } from '@infragraph/shared';

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
    const response: ParseResponse = result;
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
    const response: ParseResponse = parseResult;
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

    // Detect provider from resource type keys in the HCL, or use query param
    const override = resolveProviderParam(req.query['provider']);
    // We need to peek at resource types for auto-detection before full parse
    // For simplicity, parse first with detected provider
    // Quick-parse to get resource type keys
    const { parse: parseHcl } = await import('@cdktf/hcl2json');
    const allTypes: string[] = [];
    for (const [name, content] of fileMap) {
      const result = await parseHcl(name, content);
      const resourceBlocks = result['resource'] as Record<string, unknown> | undefined;
      if (resourceBlocks) allTypes.push(...Object.keys(resourceBlocks));
    }
    const provider = override ? getProvider(override) : detectProviderFromTypes(allTypes);

    const { resources, warnings } = await extractResourcesFromHcl(fileMap, provider);
    const graphResult = buildGraphFromResources(resources, warnings, provider);
    const response: ParseResponse = graphResult;
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse HCL', details: message };
    res.status(422).json(apiErr);
  }
});
