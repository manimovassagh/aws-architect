# GitHub Connect — Design Document

## Overview

Users paste a GitHub repo URL, the app scans for Terraform projects (directories with `.tf` files), shows a picker, and the user selects one to visualize — reusing the existing HCL parse pipeline.

## Scope (v1)

- **Public repos only** — GitHub API allows 60 req/hr unauthenticated
- URL input → scan → project selection → parse → canvas
- Reuses `extractResourcesFromHcl` + `buildGraphFromResources`

## Architecture

### Backend (2 new endpoints)

All GitHub API calls happen server-side (CORS + rate limit reasons):

1. **POST /api/github/scan** — `{ repoUrl }` → list of Terraform project dirs
   - Uses Git Trees API (`recursive=1`) — single call for entire file tree
   - Groups `.tf` files by directory

2. **POST /api/github/parse** — `{ repoUrl, projectPath }` → `ParseResponse`
   - Fetches `.tf` files from `raw.githubusercontent.com` (not rate-limited)
   - Feeds into `extractResourcesFromHcl` → `buildGraphFromResources`

### Frontend (modal on landing page)

- "Connect GitHub Repo" button on landing page (next to upload/samples)
- Modal: URL input → scan → project list → click to parse → canvas

## Key Decisions

1. **Backend-only GitHub calls** — CORS prevents frontend→GitHub API
2. **Git Trees API (recursive)** — entire repo in 1 API call
3. **raw.githubusercontent.com** — not rate-limited unlike REST API
4. **Public repos only for v1** — no PAT/OAuth complexity
5. **Modal UX** — no new routes, keeps flow compact
