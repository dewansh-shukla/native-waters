# Browser regression investigation

17 November 2026, local production candidate before the final www-host correction.

The first 48-case browser batch was cancelled before completion when the production candidate was superseded. Its partial log is retained in `refinement-browser-tests.txt`; failures were investigated rather than treated as a passing run.

- The new complete homepage → Cauvery basin → underwater exhibit → Arulius profile → basin journey passed on desktop. No-JavaScript field-guide and all basin/species HTML tests passed on desktop; field guide also passed on touch.
- Several existing error-recovery tests reached their functional assertions but failed the console-error check because local production loaded `/_vercel/insights/script.js`, which exists only on Vercel and returned 404 locally. RootLayout now mounts Vercel Analytics only when the build platform reports `VERCEL=1`. Deployed analytics remains enabled; no console errors were filtered out to hide this issue.
- Mobile failure tests targeted the polar-parrot fixture, which the reduced visible roster intentionally does not fetch. They now intercept the real Zebra Danio high/low asset used by both quality tiers. Retry assertions account for the initial quality-dependent requests.
- Keyboard-resume screenshot assertions in Playwright's headless shell timed out: trace calls took 29,892 ms and 31,112 ms, exceeding their 15-second assertion deadline. The actual browser with ANGLE Metal / Apple M1 Pro showed changing canvas pixels after keyboard resume; 30 observed animation frames took 488.9 ms. This was a diagnostic observation on the development build, not a production benchmark or field CWV measurement.
- Browser tests now use Playwright's supported `channel: "chromium"` full-browser headless mode, rather than the separate headless shell. This follows https://playwright.dev/docs/browsers#chromium-new-headless-mode and preserves all behavioral assertions, including paused pixel stability, context loss and delayed asset recovery. The unsafe SwiftShader fallback remains available on systems without hardware acceleration.

Final test results, production performance and remaining limitations belong in `docs/taste-redesign-results.md`; this investigation alone does not establish final acceptance.

Full-browser follow-up resolved the screenshot timing failures: desktop playback passed in 4.8s, visibility in 4.0s, and delayed context recovery in 17.7s. The full 54-case run passed 47 cases, skipped six desktop instances of mobile-only tests, and exposed one obsolete mobile locator: the fish picker is deliberately hidden while the selected-fish panel is visible. Its assertion now checks that the selected Albino Zebra Danio remains visible after HIGH → LOW. Both desktop and touch keyboard journeys pass in the focused follow-up. No application state logic was changed to satisfy that locator.
