# Testing and verification

This document separates automated tests from manual acceptance tests. A successful build or health endpoint does not prove every user-facing feature works.

## Environment

- Application: OpenSource Radar
- Automated test command: `npm test`
- Production build command: `npm run build`
- Deployed health endpoint: verified during deployment troubleshooting; response observed:
  `{"ok":true,"authenticated":false}`
- Live production URL: add the exact Vercel URL here.

## Automated tests

Run:

```bash
npm test
```

The current Node test suite covers the difficulty policy. Check the test output and update the result column after running it against the final committed version.

| ID | Scenario | Expected result | Result |
|---|---|---|---|
| UNIT-01 | Label is `good first issue` | Beginner | Record after run |
| UNIT-02 | Label is `advanced` | Advanced | Record after run |
| UNIT-03 | Only unrelated labels such as `bug` are present | Unclassified | Record after run |
| UNIT-04 | Beginner and Advanced labels both appear | Beginner under documented precedence | Record after run |
| UNIT-05 | Label uses different capitalization or whitespace | Recognized label still matches | Record after run |
| UNIT-06 | Labels are absent or malformed | Safe Unclassified fallback | Record after run |
| UNIT-07 | Label is `medium difficulty` | Intermediate | Record after run |

## Manual acceptance tests

Run these against the deployed app in a browser. Mark each as **PASS**, **FAIL**, or **NOT RUN**, and add brief evidence/notes. Do not mark untested cases as passed.

| ID | Test | Expected result | Actual result / evidence |
|---|---|---|---|
| MAN-01 | Open the production homepage | UI loads without a blocking error | NOT RUN |
| MAN-02 | Open `/api/health` | JSON includes `ok: true` | PASS — observed `{"ok":true,"authenticated":false}` |
| MAN-03 | Search for `is:open is:issue` | Issues load, or a useful API error appears | NOT RUN |
| MAN-04 | Search for a query with no matching issues | Clear empty state; no crash | NOT RUN |
| MAN-05 | Apply repository filter | Visible results match the selected repository | NOT RUN |
| MAN-06 | Apply language filter | Results use matching repository-language metadata | NOT RUN |
| MAN-07 | Apply label and difficulty filters | Results reflect selected filters and documented policy | NOT RUN |
| MAN-08 | Change page and navigate back | Correct page/results; pagination remains coherent | NOT RUN |
| MAN-09 | Bookmark an issue and refresh | Bookmark persists in the same browser | NOT RUN |
| MAN-10 | Change status through all four stages and refresh | Status persists; dashboard updates | NOT RUN |
| MAN-11 | Save a valid GitHub issue URL and PR URL | Values are accepted and shown in the record | NOT RUN |
| MAN-12 | Enter an invalid URL in the contribution form | Validation prevents or clearly flags invalid input | NOT RUN |
| MAN-13 | Trigger a GitHub rate-limit response or simulate it | Clear message and retry guidance; app remains usable | NOT RUN |
| MAN-14 | Simulate network failure or slow upstream response | Useful timeout/network error and recovery path | NOT RUN |
| MAN-15 | Put invalid JSON into the app's localStorage key and reload | App does not crash; recovery behavior is clear | NOT RUN |
| MAN-16 | Resize to mobile width and use keyboard navigation | Layout remains usable and focus/labels are visible | NOT RUN |
| MAN-17 | Run production build and start command | Build succeeds; app and API routes are served correctly | NOT RUN |

## Refinement log: implementation fixes

The following code-level fixes are present in the project documentation/source history and should be checked against the final code before submission. They are not a substitute for recording observed manual test outcomes.

1. **Unbounded search input:** the API rejects queries longer than 240 characters with HTTP 400.
2. **Unhelpful upstream failure behavior:** GitHub rate-limit responses receive a dedicated response, while timeouts and network failures return user-readable errors.
3. **Arbitrary difficulty assumptions:** difficulty is based on recognized labels and uses an Unclassified fallback when metadata is missing.
4. **Missing repository-language field:** the server retrieves repository metadata separately and caches it; failed lookups leave language unknown rather than failing the whole issue request.
5. **Unbounded pagination parameters:** page and per-page values are constrained to supported ranges; GitHub's 1,000-result search limit is documented.
6. **Potential repeated API calls:** in-memory caches are used for issue searches and repository-language metadata.
7. **Test drift:** the difficulty tests import the same classifier module used by the API rather than duplicating the rules in the test.
8. **Deployment entry-point detection:** Vercel's initial Express entry-point detection error was investigated; after deployment, the health endpoint was verified. Record the exact final configuration/commit if asked.

## Final verification notes

Before submission:

- Run `npm test` and record the actual pass/fail output.
- Run `npm run build` and confirm it succeeds.
- Test the deployed homepage, issue search, filtering, pagination, saved records, dashboard, empty state, and error behavior.
- Record at least three genuine issues discovered during your own testing, the code/UI change that fixed each, and how you verified each fix. Do not invent defects or claim a fix was tested if it was not.
