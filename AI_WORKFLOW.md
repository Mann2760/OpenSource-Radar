# AI-assisted development disclosure

## Tools used

OpenAI ChatGPT was used as an AI coding assistant during development and refinement. It helped discuss architecture and implementation approaches, troubleshoot deployment configuration, review edge cases, and draft documentation.

The application does not call an AI model at runtime. Its normal operation uses React, Express, Node.js, and the GitHub REST API.

If any other AI tools were used, add them here only if accurate. Do not claim to have used tools that were not part of the actual workflow.

## Development workflow

1. Read the assignment and translated it into feature areas: GitHub issue discovery, filtering, difficulty classification, bookmarks, contribution status tracking, issue/PR URLs, dashboard summaries, pagination, and error handling.
2. Chose React and Vite for the frontend, with Node.js and Express for API routing and GitHub integration.
3. Integrated GitHub Search Issues and repository metadata requests.
4. Added a documented label-based difficulty policy rather than presenting an arbitrary score as objective difficulty.
5. Added query bounds, request timeouts, caching, rate-limit handling, and frontend states for empty or failed requests.
6. Used local browser storage for bookmarks and contribution records, accepting that this does not provide account-level or cross-device synchronization.
7. Used AI assistance to reason about deployment and documentation, then checked the resulting behavior and configuration.
8. Prepared automated tests and manual acceptance checks to compare the implementation against the assignment rubric.

## Improvements and refinement

The implementation includes the following refinements; verify each one against the current source before describing it in an interview:

- Difficulty classification is based on recognized issue labels and falls back to **Unclassified** when no recognized label is available.
- The issue API has a short-lived response cache; repository-language metadata has a longer cache.
- Query length and pagination parameters are bounded.
- The backend handles GitHub rate-limit responses and upstream timeout/network errors.
- Repository language is fetched separately because it is not included in the issue-search result itself; a failed language lookup does not need to discard the issue.
- Automated tests target the production difficulty-classification function.
- README and test documentation explain persistence limitations, API behavior, and manual verification steps.
- Deployment was debugged after Vercel initially failed to detect the Express entry point; the deployed `/api/health` endpoint was subsequently checked and returned `{"ok":true,"authenticated":false}`.

## Testing discipline

AI suggestions were treated as proposals to review, not proof that code works. Automated tests, a production build, the deployed health endpoint, and manual user-flow tests are separate checks. Only mark a test as passed after observing the result.

Before submission, record the actual outcome of issue search, filters, pagination, bookmark/status persistence, dashboard updates, empty results, invalid URLs, and rate-limit/error states in `TESTING.md`.

## What I learned

- Why frontend presentation and backend API handling can be separated.
- How a backend can centralize API validation, caching, and upstream error handling.
- Why GitHub issue-search data may need enrichment from repository metadata.
- Why maintainer labels are only signals and cannot guarantee issue difficulty.
- Why localStorage persistence is different from a server-side database.
- Why successful deployment and a successful health endpoint do not, by themselves, prove every feature works.

## Limitations and next improvements

Potential improvements include stronger automated integration tests, better accessibility checks, cross-device persistence through accounts and a database, shared caching, and more explicit explanations of difficulty labels. These are future improvements, not features to claim as already implemented.
