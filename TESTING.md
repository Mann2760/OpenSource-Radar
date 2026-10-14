# Testing and verification plan

## Automated tests

Run from the project root:

```bash
npm test
```

The Node test suite currently covers seven difficulty-policy cases and imports the actual production classifier from `server/difficulty.js`:

| ID | Scenario | Expected result |
|---|---|---|
| UNIT-01 | Label is `good first issue` | Beginner |
| UNIT-02 | Label is `advanced` | Advanced |
| UNIT-03 | Only labels such as `bug` and `help wanted` are present | Unclassified, not guessed |
| UNIT-04 | Both `advanced` and `easy` labels are present | Beginner under the documented precedence rule |
| UNIT-05 | Label uses different capitalization and whitespace | Still matches Beginner |
| UNIT-06 | Labels are absent, null, or malformed | Safely returns Unclassified |
| UNIT-07 | Label is `medium difficulty` | Intermediate |

The tests import the same classifier module used by the server, avoiding a duplicated implementation in the test file. They run without live GitHub requests.

## Manual acceptance test cases

Run these against a locally running app or the deployed URL and fill in the Result column with the observed outcome. The project should not claim these manual tests passed until they have actually been performed.

| ID | Steps | Expected result | Result / notes |
|---|---|---|---|
| MAN-01 | Open the app with a working network connection | Loading resolves to issues or a useful empty/error state; no endless spinner | Not run here |
| MAN-02 | Search a valid query such as `is:open is:issue label:documentation` | Results correspond to the query and each issue links to GitHub | Not run here |
| MAN-03 | Enter a query longer than 240 characters through the API | API returns HTTP 400 with a validation message | Not run here |
| MAN-04 | Use repository filter with `owner/repo` or a partial name | Visible results narrow to matching repository names | Not run here |
| MAN-05 | Choose a programming language | Only results with matching repository-language metadata remain | Not run here |
| MAN-06 | Filter by a label fragment | Results without a matching label are hidden | Not run here |
| MAN-07 | Select each difficulty option | Explicitly labelled issues classify according to policy; others remain Unclassified | Not run here |
| MAN-08 | Bookmark an issue, reload the page, open Saved | Bookmark remains in this browser | Not run here |
| MAN-09 | Track an issue and move it through all four statuses | Dashboard counts/status update and remain after reload | Not run here |
| MAN-10 | Save a valid GitHub PR URL and a note to a contribution record | Values are saved and can be reopened | Not run here |
| MAN-11 | Try malformed/non-GitHub issue or PR URL in the record editor | Input is rejected or validation feedback is shown; invalid data is not silently accepted | Not run here |
| MAN-12 | Navigate forward and back through issue pages | Page changes, controls disable at boundaries, and no duplicate/incorrect page state appears | Not run here |
| MAN-13 | Trigger/observe GitHub 403 or 429 rate limiting | Clear rate-limit message appears with retry guidance; app remains usable | Not run here |
| MAN-14 | Disconnect network or simulate a slow GitHub response | Error/timeout state appears and retry is available | Not run here |
| MAN-15 | Search a query with zero matching issues | Empty state appears without a crash | Not run here |
| MAN-16 | Put malformed JSON in the app's localStorage key and reload | App recovers without crashing; user may need to recreate local records | Not run here |
| MAN-17 | Resize viewport to mobile width and navigate by keyboard | Layout remains usable; key controls have labels and visible focus | Not run here |
| MAN-18 | Run `npm run build` then `npm start` | Production build serves the app and `/api/health` responds | Not run here |

## Refinement log: issues identified and addressed

The following are implementation-level fixes made during development; the manual table above remains unverified until exercised in a browser.

1. **Unbounded user query input:** API search queries longer than 240 characters are rejected with HTTP 400 instead of being forwarded upstream.
2. **Unclear upstream failures:** GitHub rate-limit errors are mapped to HTTP 429, upstream timeouts and connection failures return actionable messages, and the client exposes a retry action.
3. **Arbitrary difficulty scoring:** classification is based on documented issue-label patterns; missing or ambiguous metadata is shown as Unclassified.
4. **Missing language metadata:** because GitHub's issue-search response does not include repository language, repository metadata is fetched separately and cached; failed lookups do not discard issue results.
5. **Pagination boundary:** page number and page size are bounded, and the interface notes GitHub's 1,000-result search limit.
6. **Corrupt browser storage:** local-storage parsing is guarded so invalid JSON does not prevent the app from loading.
7. **Invalid contribution URLs:** issue/PR URL validation is included in the contribution-record workflow.
8. **Test drift risk:** difficulty classification was extracted into `server/difficulty.js` and tests now import that exact function instead of maintaining a duplicate copy. Additional cases cover malformed labels and normalization.

## Environment limitations

Automated tests are local and deterministic; they do not prove that GitHub is reachable or that a deployed host is configured correctly. Run the production build and the manual acceptance tests on the final deployment before submission, and update this document with actual results and any defects discovered.


## Vercel deployment acceptance checks

- Confirm the deployment build runs `npm run build` and creates `public/index.html` plus hashed assets.
- Confirm `/` serves the React app from Vercel static hosting.
- Confirm `/api/health` invokes the exported Express app and returns JSON.
- Confirm `/api/issues?q=is%3Aopen%20is%3Aissue` returns issue JSON or a correctly handled GitHub API error.
- Confirm `GITHUB_TOKEN` is configured only as a server-side Vercel environment variable, never as a `VITE_*` variable.
- Confirm browser refresh does not erase localStorage records in the same browser.
- Inspect Vercel function logs for import, runtime, timeout, and upstream API errors.
