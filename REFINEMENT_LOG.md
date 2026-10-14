# Testing and refinement log

Use this log to satisfy the assignment requirement to identify, document, and fix at least three issues during testing and refinement.

**Important:** Keep only entries that match issues you actually observed and fixed. Add the date, evidence, commit/changed file, and retest result. The examples below are candidate implementation fixes to verify, not permission to claim an unobserved bug.

| # | Issue observed | Fix made | Verification evidence | Status |
|---|---|---|---|---|
| 1 | Search input longer than the supported limit could result in an invalid/poor upstream request. | Backend rejects queries over 240 characters with HTTP 400 and a clear message. | Call `/api/issues` with a query longer than 240 characters and confirm HTTP 400. | Verify on final deployment |
| 2 | GitHub rate-limit and upstream failures need distinct, understandable handling. | Backend maps rate-limit responses to HTTP 429 and handles timeouts/network failures with useful error responses. | Simulate or observe a rate-limit/error response and capture the response/UI message. | Verify on final deployment |
| 3 | Assigning difficulty without supporting metadata can be misleading. | Classifier uses recognized labels and falls back to Unclassified. | Run the unit tests for recognized and missing labels; inspect the issue card for an unclassified issue. | Run `npm test` and verify UI |
| 4 | GitHub Search Issues does not provide repository primary language directly. | Fetch repository metadata separately and cache language lookups; allow issue results when language lookup fails. | Inspect an issue with known repository language and simulate/observe failed metadata lookup if feasible. | Verify on final deployment |
| 5 | Malformed browser storage can break persisted client state if parsing is not guarded. | Defensive storage parsing, if present in the current frontend implementation. | Corrupt the relevant localStorage value and reload; record observed recovery. | Verify source and test |
| 6 | Invalid issue/PR URLs should not silently enter contribution records. | URL validation, if present in the current contribution-record editor. | Try a malformed URL and record the validation response. | Verify source and test |

## How to finalize this log

For each of at least three genuine issues:

1. Reproduce the problem.
2. Record the original behavior and expected behavior.
3. Make and commit the fix.
4. Retest the exact scenario.
5. Update the row with the file/commit and result.

A validation rule implemented as part of initial development is not automatically an issue “found and fixed” during testing. If you did not observe the problem before the change, describe it honestly as a preventive improvement instead of a discovered bug.
