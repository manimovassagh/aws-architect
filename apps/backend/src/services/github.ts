import type { GitHubTerraformProject } from '@infragraph/shared';

interface RepoInfo {
  owner: string;
  repo: string;
}

/** Parse a GitHub URL into owner/repo. Supports both github.com URLs and shorthand. */
export function parseRepoUrl(url: string): RepoInfo {
  // Match: https://github.com/owner/repo[/...]
  const match = url.match(
    /^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/,
  );
  if (!match) {
    throw new Error(
      'Invalid GitHub URL. Expected format: https://github.com/owner/repo',
    );
  }
  return { owner: match[1]!, repo: match[2]!.replace(/\.git$/, '') };
}

interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitTreeResponse {
  sha: string;
  url: string;
  tree: GitTreeItem[];
  truncated: boolean;
}

/** Scan a GitHub repo for directories containing .tf files. */
export async function scanRepo(
  owner: string,
  repo: string,
  branch = 'main',
): Promise<{ defaultBranch: string; projects: GitHubTerraformProject[] }> {
  // Use the Git Trees API with recursive=1 to get the full file tree in one call
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(treeUrl, {
    headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'InfraGraph' },
  });

  if (res.status === 404) {
    // Try 'master' as fallback for older repos
    if (branch === 'main') {
      return scanRepo(owner, repo, 'master');
    }
    throw new Error(`Repository not found: ${owner}/${repo}`);
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as GitTreeResponse;

  // Group .tf files by directory
  const dirFiles = new Map<string, string[]>();
  for (const item of data.tree) {
    if (item.type === 'blob' && item.path.endsWith('.tf')) {
      const lastSlash = item.path.lastIndexOf('/');
      const dir = lastSlash === -1 ? '.' : item.path.substring(0, lastSlash);
      const fileName = item.path.substring(lastSlash + 1);
      if (!dirFiles.has(dir)) dirFiles.set(dir, []);
      dirFiles.get(dir)!.push(fileName);
    }
  }

  const projects: GitHubTerraformProject[] = Array.from(dirFiles.entries())
    .map(([path, files]) => ({
      path,
      files,
      resourceCount: 0, // Will be populated during parse, not scan
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return { defaultBranch: branch, projects };
}

/** Fetch all .tf file contents from a specific project directory. */
export async function fetchTfFiles(
  owner: string,
  repo: string,
  branch: string,
  projectPath: string,
  fileNames: string[],
): Promise<Map<string, string>> {
  const fileMap = new Map<string, string>();

  // Fetch from raw.githubusercontent.com (CDN, not rate-limited)
  const fetches = fileNames.map(async (fileName) => {
    const filePath =
      projectPath === '.' ? fileName : `${projectPath}/${fileName}`;
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const res = await fetch(rawUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
    }
    const content = await res.text();
    fileMap.set(fileName, content);
  });

  await Promise.all(fetches);
  return fileMap;
}
