import { Router } from 'express';
import { z } from 'zod';
import type { ApiError, GitHubScanResponse } from '@infragraph/shared';
import { parseRepoUrl, scanRepo, fetchTfFiles } from '../services/github.js';
import { extractResourcesFromHcl } from '../parser/hcl.js';
import { buildGraphFromResources } from '../parser/graph.js';
import { detectProviderFromTypes } from '../providers/index.js';

export const githubRouter = Router();

const ScanSchema = z.object({
  repoUrl: z.string().url().refine(
    (url) => url.includes('github.com'),
    { message: 'Must be a GitHub URL' },
  ),
});

const ParseSchema = z.object({
  repoUrl: z.string().url(),
  projectPath: z.string().min(1),
});

// POST /api/github/scan — scan a repo for Terraform projects
githubRouter.post('/github/scan', async (req, res) => {
  const parsed = ScanSchema.safeParse(req.body);
  if (!parsed.success) {
    const err: ApiError = { error: 'Invalid request', details: parsed.error.message };
    res.status(400).json(err);
    return;
  }

  try {
    const { owner, repo } = parseRepoUrl(parsed.data.repoUrl);
    const { defaultBranch, projects } = await scanRepo(owner, repo);

    if (projects.length === 0) {
      const err: ApiError = { error: 'No Terraform projects found', details: 'This repository does not contain any .tf files' };
      res.status(404).json(err);
      return;
    }

    const response: GitHubScanResponse = { owner, repo, defaultBranch, projects };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to scan repository', details: message };
    res.status(422).json(apiErr);
  }
});

// POST /api/github/parse — fetch + parse a specific project directory
githubRouter.post('/github/parse', async (req, res) => {
  const parsed = ParseSchema.safeParse(req.body);
  if (!parsed.success) {
    const err: ApiError = { error: 'Invalid request', details: parsed.error.message };
    res.status(400).json(err);
    return;
  }

  try {
    const { owner, repo } = parseRepoUrl(parsed.data.repoUrl);

    // First scan to get the branch and file list
    const { defaultBranch, projects } = await scanRepo(owner, repo);
    const project = projects.find((p) => p.path === parsed.data.projectPath);
    if (!project) {
      const err: ApiError = { error: 'Project not found', details: `No .tf files in ${parsed.data.projectPath}` };
      res.status(404).json(err);
      return;
    }

    // Fetch .tf file contents
    const fileMap = await fetchTfFiles(owner, repo, defaultBranch, project.path, project.files);

    // Detect provider from HCL resource types
    const { parse: parseHcl } = await import('@cdktf/hcl2json');
    const allTypes: string[] = [];
    for (const [name, content] of fileMap) {
      const result = await parseHcl(name, content);
      const resourceBlocks = result['resource'] as Record<string, unknown> | undefined;
      if (resourceBlocks) allTypes.push(...Object.keys(resourceBlocks));
    }
    const provider = detectProviderFromTypes(allTypes);

    // Parse HCL and build graph
    const { resources, warnings } = await extractResourcesFromHcl(fileMap, provider);
    const graphResult = buildGraphFromResources(resources, warnings, provider);

    res.json(graphResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const apiErr: ApiError = { error: 'Failed to parse project', details: message };
    res.status(422).json(apiErr);
  }
});
