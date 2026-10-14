# OpenSource Radar — Code Walkthrough & Interview Preparation

This guide is a learning aid. Read the source and be able to explain it in your own words; do not memorize answers you cannot defend.

## 1. Thirty-second project pitch

OpenSource Radar is a contribution-discovery and personal tracking tool. It queries GitHub's public issue search API, enriches results with repository-language metadata, and lets a developer filter and bookmark issues. A local contribution record moves through Interested, In Progress, PR Submitted, and Completed. The dashboard summarizes those records by status and repository. It does not create branches, submit pull requests, or synchronize records between devices.

## 2. Architecture at a glance

```text
Browser (React + Vite)
   |  GET /api/issues?q=...&page=...&per_page=12
   v
Express server (server/index.js)
   |  validates and bounds inputs
   |  checks 60-second in-memory search cache
   |  adds GitHub API headers/token server-side
   v
GitHub REST API: /search/issues
   |  issue result payloads
   v
Express enriches each result with repository language
   |  repository metadata cache: 6 hours
   v
Normalized JSON -> React UI

React contribution state -> browser localStorage
```

Why a server proxy? It keeps an optional GitHub token out of browser JavaScript, centralizes validation and rate-limit handling, and provides one same-origin API for the frontend. The Vite proxy sends local `/api` requests to port 8787 during development; Vite builds the frontend into `public/`; locally Express serves those files, while Vercel serves `public/` assets via its CDN and runs the exported Express app as a Function.

## 3. File-by-file explanation

### `src/main.jsx`

The frontend entry point. It imports React, the DOM renderer, `App`, and global CSS, then mounts the app into the root element in `index.html`. It should remain small; feature behavior belongs in components/modules rather than the bootstrap file.

### `src/App.jsx`

This is the main React application and currently holds most UI behavior.

- **Constants:** `STATUSES` defines the four workflow states; `STATUS_CLASS` maps them to CSS classes; `STORAGE_KEY` versions the local-storage key.
- **Helpers:** `readRecords` catches malformed local-storage JSON; `dateLabel` and `relative` format dates safely; `repoOf` derives `owner/repo`; `recordFor` supplies defaults for an issue without an existing record.
- **`Icon`:** a small inline SVG icon component. It avoids adding an icon dependency.
- **React state:** `useState` stores the current tab, API results, query, filters, loading/error state, selected issue, and editor form. `useRef` stores the current `AbortController` so an older request can be cancelled. `useEffect` persists records and fetches issues when the query changes. `useMemo` derives filtered issues and dashboard aggregates; `useCallback` stabilizes `fetchIssues`.
- **`fetchIssues`:** creates query parameters, aborts an earlier request, fetches `/api/issues`, checks HTTP errors, and updates results/loading/rate-limit state. Abort errors are ignored because cancellation is intentional.
- **Filtering:** `visibleIssues` filters the currently loaded page by repository substring, language, label substring, difficulty, and status. These are client-side filters over that page, not a global scan of every GitHub result.
- **Tracking:** `openEditor` loads a record into the form; `saveRecord` validates GitHub URLs and writes the contribution; `setQuickStatus` changes a stage; `toggleBookmark` toggles a bookmark. State changes trigger the persistence effect.
- **Dashboard:** `tracked`, `counts`, and `repoCounts` are derived from stored records. They are calculated data, not separately persisted totals, which avoids counters drifting away from the records.
- **`IssueRow`:** renders one issue, its labels, expandable description, bookmark button, status, and tracking actions.
- **`Dashboard`:** renders status totals, repository activity, recent records, and the difficulty-policy explanation.

### `server/index.js`

The Express backend.

1. Loads environment variables with `dotenv` and configures JSON parsing and CORS.
2. Creates GitHub headers, adding `Authorization: Bearer ...` only when `GITHUB_TOKEN` exists.
3. Defines an in-memory issue cache (60 seconds) and repository-language cache (six hours).
4. `GET /api/health` reports whether the server is alive and whether a token is configured; it never returns the token itself.
5. `GET /api/issues` trims and validates the query, bounds page and page size, checks the cache, then requests GitHub's issue search endpoint.
6. Handles GitHub 403/429 as rate-limit responses, other HTTP failures, timeouts, and network errors.
7. Adds language metadata from repository endpoints because issue search does not include that field reliably. If language lookup fails, the issue remains available with unknown language.
8. Normalizes upstream data into a smaller, predictable response for the client.
9. Serves built `public/` assets locally after API routes are registered; on Vercel, static assets are served by the CDN.

### `server/difficulty.js`

This is the single source of truth for difficulty classification. It normalizes string labels and GitHub label objects, ignores malformed values, then applies documented patterns. Beginner takes precedence over Intermediate, then Advanced when labels conflict. No recognized label means `Unclassified`. This classification is only a label-based hint; repositories use labels inconsistently, so it cannot guarantee actual effort.

### `server/index.test.js`

Uses Node's built-in `node:test` and `assert` modules, so these unit tests do not need a browser or live GitHub connection. They import the real classifier module rather than copying its logic, reducing the chance that tests pass while production code behaves differently.

### `src/styles.css`

Contains the design system and responsive layouts: color variables, typography, navigation, issue rows, controls, empty/loading/error states, dashboard panels, modal styling, and mobile breakpoints. Styling is custom rather than a copied component-library theme.

### `vite.config.js`

Enables the React plugin and proxies `/api` to `http://localhost:8787` while the Vite development server is running. Without this proxy, the browser's `/api` requests would go to the Vite server instead of Express during local development.

### `package.json`

- `npm run dev`: runs the Express server and Vite client concurrently.
- `npm run build`: builds static client assets into `public/` for Vercel.
- `npm start`: starts Express, which serves both the API and built frontend.
- `npm test`: runs Node's built-in test runner.

### `.env.example` and `.gitignore`

`.env.example` documents environment variables without containing a real token. `.gitignore` excludes `node_modules`, build output, and `.env`. Verify this before publishing to GitHub.

## 4. Important implementation decisions

### Why use GitHub Search Issues API?

It supports GitHub's own query syntax, labels, language qualifiers, and paginated public issue discovery. The app adds `is:issue` to prevent pull requests from being returned as issues. GitHub's issue search is limited to a 1,000-result window; this is surfaced in the interface rather than pretending the entire result set can be paged forever.

### Why fetch repository language separately?

The search response contains a repository URL, but not a dependable repository-language field. The backend requests repository metadata and caches it for six hours to avoid repeatedly spending API quota on the same repositories. A failed enrichment should not discard an otherwise valid issue.

### Why keep records in `localStorage`?

It makes the demo usable without authentication or a database. It is simple, but records are browser-specific, can be cleared by the user, and do not sync across devices. A production multi-user version would use authentication and a database such as PostgreSQL.

### Why is the GitHub token server-side?

Anything shipped to the browser can be inspected. A token in React code or a `VITE_*` variable is not secret. Keep `GITHUB_TOKEN` only in the server environment and never commit `.env`.

### What does the cache actually do?

The in-memory cache reduces duplicate requests during a running server process. It is not shared across multiple server instances and resets on restart. A distributed deployment could use Redis with TTLs. The language cache uses a longer TTL because repository language changes less frequently than issue search results.

## 5. Honest limitations to state in an interview

- Contribution records are local to one browser and there is no login, database, or cross-device sync.
- The app tracks a PR URL but does not submit PRs or verify the PR's actual GitHub state.
- Filters apply to the currently loaded result page; use GitHub query syntax to narrow the upstream search before filtering.
- Difficulty is a label heuristic, not an estimate of engineering effort.
- Language enrichment causes extra API requests, mitigated by a six-hour in-memory cache. If a repo lookup fails, language is unknown.
- In-memory caches reset on restart and are not shared between replicas.
- The test suite has focused unit coverage for difficulty classification. The documented browser/API acceptance cases must still be run manually before claiming they passed.
- A dependency-install timeout prevented confirming a production build in the authoring environment. Run `npm install`, `npm test`, and `npm run build` on your machine before submission.

## 6. Interview questions and answer outlines

**Q: Walk me through the request flow.**

A: The React UI calls our same-origin `/api/issues` route. Express validates query length and pagination, checks its short-lived cache, calls GitHub's Search Issues API, handles upstream errors, enriches each result with repository language from metadata, normalizes the fields, and returns JSON. React stores the results and renders issue rows.

**Q: Why not call GitHub directly from React?**

A: A server proxy protects an optional token and centralizes validation, caching, normalization, and rate-limit handling. Public unauthenticated calls are possible, but their quota is more restrictive. A browser-exposed token would be a security mistake.

**Q: How do you handle rate limits?**

A: The backend reads rate-limit headers and maps 403/429 responses to a 429 response with reset information and guidance. The client displays the error and retry option. Retry should not be automatic and aggressive because it can worsen rate limiting.

**Q: Why not calculate difficulty from title or number of comments?**

A: Those are weak proxies. The current rule uses explicit labels and returns Unclassified when metadata is absent. This is transparent and deterministic, though label conventions differ by project.

**Q: What is the difference between `useState`, `useEffect`, `useMemo`, and `useCallback` here?**

A: `useState` stores UI/application state; `useEffect` handles side effects such as fetching and persistence; `useMemo` caches derived filters/counts between relevant state changes; `useCallback` stabilizes the fetch function reference used by the effect. Memoization is an optimization, not a correctness requirement.

**Q: Why use `AbortController`?**

A: If a user searches again before an older request completes, the old request can be cancelled so stale results do not overwrite newer ones and unnecessary work is reduced.

**Q: What are the trade-offs of `localStorage`?**

A: It is simple and needs no backend database, but is browser-local, has limited capacity, and has no multi-user access control or synchronization. A real product would persist records server-side behind authentication.

**Q: How did you test it?**

A: Seven deterministic unit tests exercise the actual classifier function, including explicit beginner/advanced/intermediate labels, unknown labels, conflicting labels, case/whitespace normalization, and malformed metadata. Separately, I use the manual acceptance checklist for API, pagination, storage, URL validation, responsive layout, and error states. I only mark a manual test passed after running it.

**Q: What did AI do, and what did you do?**

A: ChatGPT helped scaffold and review code and draft documentation. I reviewed the architecture, extracted difficulty policy into a shared module so tests exercise production logic, added tests for malformed labels and normalization, and documented limitations. I do not claim AI-generated code is automatically correct; I run tests, inspect changes, and verify the live workflow. Add only changes you personally understand and can demonstrate.

**Q: What would you build next?**

A: First, finish live end-to-end verification. Then add authenticated accounts and PostgreSQL persistence, better integration tests with mocked GitHub responses, rate-limit reset countdown, export/import of local records, and accessible keyboard focus management for the modal.

## 7. Suggested demo script (2–3 minutes)

1. Open Discover and explain that results come from GitHub rather than hard-coded sample data.
2. Search `is:open is:issue label:"good first issue"` and show a real issue opening on GitHub.
3. Filter by repository/language/label and explain that filters apply to the current page.
4. Bookmark an issue, refresh, and verify it appears under Saved.
5. Track it, add a note and a PR URL (use a valid example only), and move it through the four stages.
6. Open the dashboard and explain that its totals are derived from stored records.
7. Explain difficulty labels, rate-limit/empty/error states, and the localStorage trade-off.
8. Show the tests and identify which browser acceptance cases you personally ran.

## 8. Personal work you should complete before submitting

- Run the app and execute the manual test cases. Update `TESTING.md` with real results and any fixes.
- Make one meaningful UI or product improvement based on your own observation, such as a reset-filters button, a clearer no-language-data hint, or exporting/importing records. Implement it yourself after understanding the relevant code.
- Review the Git diff and remove dead/unused code you can confidently identify.
- Put your own words in the project pitch and AI disclosure; do not claim manual tests or tools you did not use.
- Be able to explain each file above without reading the answer verbatim.
