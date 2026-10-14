# OpenSource Radar

OpenSource Radar helps developers find open-source GitHub issues, judge contribution fit using issue metadata, bookmark opportunities, and track each contribution from discovery through pull-request completion.

## Live demo and source repository

- **Deployed app:** Add your deployed URL here after completing the deployment steps in [`DEPLOYMENT.md`](DEPLOYMENT.md).
- **GitHub repository:** Add your public repository URL here after pushing the source.

These links are intentionally not fabricated. Deployment and repository publishing require access to your hosting and GitHub accounts.

## Features

- Searches public issues using the GitHub Search Issues API.
- Search with GitHub query syntax, and paginate through results (GitHub's issue-search result window is limited to 1,000 results).
- Filter the currently loaded results by repository, language, labels, difficulty classification, and contribution status.
- Bookmark issues and maintain a local contribution record with notes, issue URL, PR URL, and status.
- Track the workflow: **Interested → In Progress → PR Submitted → Completed**.
- Dashboard summaries by contribution status and repository.
- Loading, empty, retry, timeout, invalid-query, and rate-limit states.
- Short-lived API response cache and six-hour repository-language cache to reduce unnecessary requests.
- Responsive layout and accessible labels for key controls.

## Technology stack

- React 18 and Vite 6 for the client and development server.
- Node.js and Express 4 for the API proxy, GitHub API integration, caching, and local production serving; Vercel serves the built static assets from `public/`.
- GitHub REST API: `GET /search/issues` and repository metadata endpoints for language information.
- Browser `localStorage` for bookmarks and contribution tracking. There is no account system or cross-device synchronization.
- Node's built-in test runner for unit tests.

## Requirements

- Node.js 20 or newer.
- npm.
- Internet access to reach `api.github.com`.

## Local setup

1. Clone/download this repository and enter the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`. A token is optional for basic use but recommended to improve GitHub API rate limits:

   ```env
   GITHUB_TOKEN=your_github_token
   PORT=8787
   ```

   Use a GitHub token with only the minimum public-read permissions needed. Never commit `.env` or paste your token into frontend code.

4. Start both the Vite client and Express server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Production build

```bash
npm test
npm run build
npm start
```

The Vite build writes frontend assets to `public/`. Locally, Express serves those assets and the `/api` routes from the same origin. On Vercel, the static assets are served by the CDN and the root `index.js` exports Express as a serverless Function.

## API integration

The client calls `GET /api/issues?q=<GitHub search query>&page=<n>&per_page=<n>`. The server calls GitHub's `GET https://api.github.com/search/issues`, requests up to 30 results per page, returns GitHub's `incomplete_results` flag and rate-limit information, and caps page numbers to the supported search window. Responses are cached in memory for 60 seconds. Repository language is not included in issue-search results, so the server enriches results from repository metadata and caches those lookups for six hours. Failed metadata lookups leave language unknown instead of failing the entire issue search.

`GET /api/health` reports whether the server is running and whether a token is configured; it does not expose the token. The server maps rate-limit responses to HTTP 429 and handles upstream timeouts/network failures with a useful error message.

## Difficulty classification policy

Difficulty is not inferred from issue title, stars, repository popularity, or an arbitrary score. It is assigned only when an issue has a recognized label:

- **Beginner:** label contains `good first issue`, `first-timers-only`, `beginner`, `easy`, or `starter issue`.
- **Intermediate:** label contains `intermediate`, `medium difficulty`, or `moderate`.
- **Advanced:** label contains `hard`, `advanced`, `difficult`, or `expert`.
- **Unclassified:** no recognized label exists.

If labels conflict, the current policy prioritizes Beginner, then Intermediate, then Advanced. This is a deterministic heuristic, not a universal truth; repositories use labels differently. Review an issue and its contribution guide before choosing it.

## Data and privacy limitations

Bookmarks and contribution records are saved in the current browser's `localStorage`. Clearing browser data can remove them, and records do not follow a user to another device. GitHub issue content is fetched live. The app does not submit pull requests or change GitHub issues; it records progress and URLs only. The in-memory server cache resets when the server restarts.

## Testing

Run `npm test`. Test scenarios and a manual verification checklist are documented in [`TESTING.md`](TESTING.md). Record the actual outcome of manual tests on the machine/browser used for final evaluation; do not mark a manual test passed without performing it.

## AI-assisted development disclosure

See [`AI_WORKFLOW.md`](AI_WORKFLOW.md) for the AI tool disclosure, development workflow, review/refinement changes, and limitations. For a file-by-file walkthrough and interview preparation, read [`INTERVIEW_GUIDE.md`](INTERVIEW_GUIDE.md). AI assistance was used to scaffold and refine code/documentation; the submitted implementation should be reviewed and understood by the submitter.

## Deployment

Follow [`DEPLOYMENT.md`](DEPLOYMENT.md) to publish the source on GitHub and deploy the app to Vercel. Replace the live-demo and repository placeholders at the top of this README once the actual URLs exist.
