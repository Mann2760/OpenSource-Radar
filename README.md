# OpenSource Radar — Contribution Intelligence Tool

OpenSource Radar helps developers discover public GitHub issues, evaluate contribution opportunities using maintainer-provided issue labels, save issues, and track progress through a contribution workflow.

> **Live demo:** `https://open-source-radar-ytya.vercel.app/`  
> **Source code:** https://github.com/Mann2760/OpenSource-Radar

Replace the live-demo placeholder with the exact Production URL shown in Vercel before submitting.

## Problem statement

Finding a suitable open-source issue can involve searching across repositories, understanding issue labels, and keeping track of opportunities and pull requests. OpenSource Radar brings issue discovery and personal contribution tracking into one interface.

## Features

- Fetches public issues and pull requests through GitHub's Search Issues API.
- Search and pagination for issue discovery.
- Filters for repository, programming language, labels, difficulty, and contribution status, as implemented in the app.
- Bookmarks and personal contribution records.
- Contribution stages: **Interested**, **In Progress**, **PR Submitted**, and **Completed**.
- Issue and pull-request URLs and notes in contribution records, where supported by the interface.
- Dashboard summaries by status and repository.
- Loading, empty, retry, validation, timeout, and rate-limit handling.
- Short-lived in-memory API response caching and repository-language caching.
- Responsive interface.
- Rule-based difficulty classification using recognized issue labels.

## Technology stack

- **React** — user interface and client-side state.
- **Vite** — development server and frontend build.
- **Node.js + Express** — backend API endpoints and GitHub API integration.
- **GitHub REST API** — issue search and repository metadata.
- **Browser localStorage** — local bookmarks and contribution tracking.
- **Node.js test runner** — automated tests.
- **Vercel** — deployment.

## Architecture

1. The user interacts with the React frontend.
2. The frontend calls the application's `/api/issues` endpoint.
3. Express validates the query, requests data from GitHub, handles upstream errors, enriches issues with repository language, and applies the difficulty-classification policy.
4. Express returns structured JSON to the frontend.
5. Personal bookmarks and progress records are saved in the browser's local storage.

The backend is useful for centralizing validation, caching, API error handling, and optional server-side credentials. It is not strictly required for every possible implementation of a public GitHub issue browser.

## Local setup

### Requirements

- Node.js 20 or newer
- npm
- Internet access to reach `api.github.com`

### Install and run

```bash
git clone https://github.com/Mann2760/OpenSource-Radar.git
cd OpenSource-Radar
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

### Environment variables

Copy `.env.example` to `.env` if you want to configure a GitHub token for local backend requests. A token is optional for basic public issue search, but authenticated requests generally have a higher rate limit.

```env
GITHUB_TOKEN=your_github_token
PORT=8787
```

Use a token with only the permissions needed for public-read access. Never commit `.env`, paste a token into React code, or expose it through a `VITE_*` variable.

### Test and production build

```bash
npm test
npm run build
npm start
```

The development script starts the Vite client and Express server. Review `package.json` if scripts change.

## API integration

### `GET /api/health`

Returns a health response indicating whether the backend is running and whether a GitHub token is configured. The token itself is never returned.

Example:

```json
{
  "ok": true,
  "authenticated": false
}
```

`authenticated: false` means no `GITHUB_TOKEN` is configured; it does not mean the backend is broken.

### `GET /api/issues`

Accepts a GitHub search query and pagination parameters, for example:

```text
/api/issues?q=is%3Aopen%20is%3Aissue&page=1&per_page=12
```

The server calls GitHub's Search Issues endpoint, maps issue data into a frontend-friendly shape, and returns pagination and rate-limit metadata. GitHub Search has a 1,000-result window, so pagination cannot traverse an unlimited number of search results.

Repository language is not included in the issue-search payload, so the server requests repository metadata separately. Language lookup failures leave the language unknown rather than discarding the issue.

### Caching and errors

- Issue search responses are cached in memory for 60 seconds.
- Repository-language metadata is cached in memory for six hours.
- Cache contents disappear when a server instance restarts; separate serverless instances may have separate caches.
- Overlong search queries are rejected.
- GitHub rate-limit responses are translated into a rate-limit response with guidance.
- Upstream timeouts and network failures return a useful error response.
- Cached data may be briefly stale.

## Difficulty classification policy

Difficulty is a deterministic label-based heuristic, not an AI model and not a guarantee of actual task complexity.

- **Beginner:** recognized labels include `good first issue`, `first-timers-only`, `beginner`, `easy`, or `starter issue`.
- **Intermediate:** recognized labels include `intermediate`, `medium difficulty`, or `moderate`.
- **Advanced:** recognized labels include `hard`, `advanced`, `difficult`, or `expert`.
- **Unclassified:** no recognized difficulty label is present.

The current precedence when recognized labels conflict is Beginner, then Intermediate, then Advanced. Repository maintainers use labels differently, so users should read the issue and contribution guide before choosing work. See `server/difficulty.js` for the actual implementation.

## Persistence and limitations

Bookmarks and contribution records are stored in the current browser's `localStorage`. They persist across page refreshes in that browser but do not synchronize across devices or browsers. Clearing site data may remove them.

The app tracks contribution progress; it does not create pull requests or modify GitHub issues on the user's behalf. The in-memory server cache is not shared between serverless instances.

## Testing

Run automated tests with:

```bash
npm test
```

See [`TESTING.md`](./TESTING.md) for automated cases, manual acceptance checks, and the refinement log. Manual checks must be marked with their actual observed result before submission.

## AI-assisted development

See [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) for the AI tools disclosure, workflow, review process, and refinements. Only report tools and changes that accurately reflect your work.

## Deployment

The application is deployed on Vercel. Replace the live-demo placeholder at the top of this README with the exact production URL and verify the live homepage, `/api/health`, and `/api/issues` before submitting.
