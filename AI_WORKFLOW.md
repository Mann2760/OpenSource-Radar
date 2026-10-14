# AI-assisted development disclosure

## Tools used

OpenAI ChatGPT was used as an AI coding assistant to help scaffold the application, suggest component and API structure, draft styling, identify edge cases, and prepare project documentation. The implementation uses ordinary React, Express, Node.js, and GitHub REST API code; it does not depend on an AI service at runtime.

If additional tools are used during your own refinement (for example, GitHub Copilot, Claude, or an IDE assistant), add their names and what they contributed here. Do not claim to have used a tool you did not use.

## Prompting/development workflow

1. Translate the task into functional requirements: live issue discovery, filters, bookmarks, staged tracking, issue/PR URLs, dashboard, pagination, and resilient API behavior.
2. Choose a small full-stack architecture: React/Vite client, Express API proxy, GitHub Search Issues API, and browser local storage for personal records.
3. Implement issue enrichment and explicit difficulty rules. Repository language is fetched from repository metadata because it is not provided in the issue-search result payload.
4. Add API validation, request timeouts, response caching, rate-limit handling, empty/error states, pagination boundaries, and storage parsing guards.
5. Add deterministic unit tests for the difficulty policy and document manual acceptance cases for the complete user journey.
6. Review the output against the original rubric, document known limitations, then run tests/build and browser checks before publishing.
7. During refinement, extract difficulty classification into a shared server module and make unit tests import the production function directly; add tests for malformed labels, case/whitespace normalization, and intermediate classification.

## Improvements over a first-pass scaffold

- Replaced an arbitrary difficulty guess with explicit label matching and an Unclassified fallback.
- Added a 60-second issue response cache and six-hour repository-language cache to reduce repeated API requests.
- Added API query bounds, page/per-page bounds, upstream timeouts, rate-limit-specific responses, and a health endpoint.
- Added empty/loading/error/retry handling and a 1,000-result pagination warning.
- Added defensive parsing for local storage and validation for issue/PR URLs.
- Added automated unit tests, a manual test matrix, setup instructions, API notes, deployment steps, and a limitations statement.
- Removed test drift risk by making the tests import the actual classifier function used by the API instead of duplicating the implementation.

## What was not independently verified

AI-generated code is not assumed correct merely because it runs or looks polished. At the time these documents were prepared, a full dependency installation/production frontend build had not been successfully completed in the authoring environment. The user must run `npm install`, `npm test`, and `npm run build`, then perform the browser-based manual acceptance tests and record real outcomes before submitting. Any defects found should be fixed and described honestly in `TESTING.md`.

## Developer understanding checklist

Before presenting this project, be prepared to explain:

- Why the GitHub API token belongs on the server and not in client-side JavaScript.
- Why language enrichment requires a repository metadata request and caching.
- How label matching maps to difficulty and why Unclassified is safer than guessing.
- How local storage differs from server-side account persistence.
- How rate limits, timeouts, empty results, and pagination boundaries are handled.
- Which automated tests exist and which acceptance tests you personally ran.
