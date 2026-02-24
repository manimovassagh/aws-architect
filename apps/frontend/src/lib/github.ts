const TOKEN_KEY = 'github_token';
const USER_KEY = 'github_user';

export interface GitHubUser {
  username: string;
  avatarUrl: string;
}

export function getGitHubToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setGitHubToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getGitHubUser(): GitHubUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GitHubUser;
  } catch {
    return null;
  }
}

export function setGitHubUser(user: GitHubUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearGitHub(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getGitHubAuthUrl(): string {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_GITHUB_CLIENT_ID is not configured');
  }
  const redirectUri = `${window.location.origin}/auth/github-callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/** Whether GitHub OAuth is configured (client ID env var is set). */
export function isGitHubOAuthConfigured(): boolean {
  return !!import.meta.env.VITE_GITHUB_CLIENT_ID;
}
