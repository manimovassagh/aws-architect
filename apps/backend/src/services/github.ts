import type { GitHubTerraformProject, GitHubRepo, GitHubTokenResponse } from '@infragraph/shared';

interface RepoInfo {
  owner: string;
  repo: string;
}

/** Build auth headers for GitHub API calls. */
function ghHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'InfraGraph',
  };
  if (token) h.Authorization = `token ${token}`;
  return h;
}

/** Exchange an OAuth code for an access token. */
export async function exchangeCode(code: string): Promise<GitHubTokenResponse> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth not configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)');
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (data.error || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'Token exchange failed');
  }

  // Fetch user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: ghHeaders(data.access_token),
  });
  if (!userRes.ok) {
    throw new Error(`Failed to fetch GitHub user: ${userRes.status}`);
  }
  const user = (await userRes.json()) as { login: string; avatar_url: string };

  return {
    access_token: data.access_token,
    username: user.login,
    avatar_url: user.avatar_url,
  };
}

/** List repositories for an authenticated user. */
export async function listUserRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    'https://api.github.com/user/repos?type=all&sort=pushed&per_page=50',
    { headers: ghHeaders(token) },
  );

  if (!res.ok) {
    throw new Error(`Failed to list repos: ${res.status} ${res.statusText}`);
  }

  const repos = (await res.json()) as GitHubRepo[];
  return repos.map((r) => ({
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    private: r.private,
    pushed_at: r.pushed_at,
    default_branch: r.default_branch,
    html_url: r.html_url,
  }));
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
  token?: string,
): Promise<{ defaultBranch: string; projects: GitHubTerraformProject[] }> {
  // Use the Git Trees API with recursive=1 to get the full file tree in one call
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(treeUrl, {
    headers: ghHeaders(token),
  });

  if (res.status === 404) {
    // Try 'master' as fallback for older repos
    if (branch === 'main') {
      return scanRepo(owner, repo, 'master', token);
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
  token?: string,
): Promise<Map<string, string>> {
  const fileMap = new Map<string, string>();

  // Fetch from raw.githubusercontent.com (CDN, not rate-limited for public repos)
  // For private repos with a token, use the API endpoint instead
  const fetches = fileNames.map(async (fileName) => {
    const filePath =
      projectPath === '.' ? fileName : `${projectPath}/${fileName}`;
    if (token) {
      // Use API for private repos (raw.githubusercontent.com doesn't support auth well)
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      const res = await fetch(apiUrl, {
        headers: { ...ghHeaders(token), Accept: 'application/vnd.github.v3.raw' },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
      }
      fileMap.set(fileName, await res.text());
    } else {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const res = await fetch(rawUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
      }
      fileMap.set(fileName, await res.text());
    }
  });

  await Promise.all(fetches);
  return fileMap;
}
