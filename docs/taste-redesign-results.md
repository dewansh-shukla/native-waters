# Native Waters — TasteSkill redesign results

## Delivery

- Worktree: `/Users/dewanshshukla/Desktop/Personal/SAAS/native-waters-taste-redesign`.
- Branch: `feat/taste-redesign`, created from fetched `origin/setup/web-foundation` at `7935858`.
- TasteSkill installed locally in `.agents/skills/design-taste-frontend`; the 2.1.5 workflow was used and installation is tracked by `skills-lock.json`. No shared agent configuration changed.
- Local production preview: <http://127.0.0.1:43200>. Restart with `npm run build && npm run start -- --hostname 127.0.0.1 --port 43200`.
- No commit, push or deployment performed. The live website does not yet contain these changes.
- [Implementation plan and execution record](superpowers/plans/2026-11-17-taste-redesign.md).

## Design direction

**A living river atlas:** mineral-paper backgrounds, deep river-green ink, Archivo typography, archival fish plates, an attributed Kaveri photograph, and a clearly labelled illustrative underwater invitation. River records become the bridge between exploration and evidence, rather than an overlay obscured by a canvas.

The ten-fact subject inventory and seeded drawing compared three directions:

| Direction | Decision |
| --- | --- |
| Contact sheet | Rejected: insufficient verified visual assets; reduces the immersive exhibit to another thumbnail. |
| Page is the object / living river atlas | Selected: accommodates geography, sourced records, scientific names and immersive entry points in one coherent structure. |
| Uneven photographs | Rejected: attractive gallery treatment, but weakens the river-to-species relationship. |

[Direction sheet](../.taste-skill/direction-sheet.md) records the draw and adaptations. General Sans was replaced with OFL-licensed Archivo because its redistribution terms did not suit a public repository. The final normal-width 400–700 WOFF2 is 34,928 bytes; its license is retained in `public/fonts/`.

Three visual refinement passes corrected footer overlap, excessive footer scale and undersized annotations. Subsequent accessibility/network corrections retained the composition. [Rendered critique](../.taste-skill/final-critique.md): self-assessment **7.6/10**, not an independent award or benchmark.

## Implemented public experience

- **Homepage:** distinct 3D and species entry points; working keyboard/touch river selector; five crawlable basin links; three honestly labelled archival plates; common/scientific-name and alias search; source-oriented introduction.
- **Five basin hubs:** HTML-first summaries, scope, citations, species rosters and inter-basin links. A prominent optional exhibit replaces the viewport-sized placeholder that previously pushed reading below the mobile fold.
- **Thirteen species profiles:** scientific/common names, available archival imagery, dated evidence, distribution associations and source limitations. Optional exhibits use the associated basin instead of silently defaulting every profile to Cauvery.
- **Field guide:** complete server-rendered species index and grouped records; progressive search; unique association anchors while preserving existing first-record anchors; native disclosure controls retain source text in HTML.
- **Navigation/accessibility:** skip link, visible focus, semantic search results, clear empty states, zoom enabled, reduced-motion support, modal focus restoration and readable WebGL failure alternatives. Reference content remains available without JavaScript.
- **Assets:** responsive optimized images, descriptive captions/alt text, source credits and self-hosted licensed typography. No invented species facts, fabricated photographs or extra thin pages.

## Immersive experience improvements

Existing Three.js/WebGL systems and models remain intact; no framework or rendering-engine replacement.

- Corrected water/background output color handling; added directional fill, atmospheric depth and terrain continuity.
- Fixed overlapping HIGH-quality particle buffers; retained natural fish motion and basin-specific optical settings.
- Removed the blocking portrait/rotation requirement; responsive controls and a compact follow panel work in portrait. Touch controls have deliberate hit areas.
- Improved asset-count loading feedback, quality changes, model retry cache clearing and scene readiness. Failed scenes retain routes to educational HTML content.
- Demand rendering when paused, hidden or in story mode; lifecycle/environment cleanup, pointer-vector reuse and removal of an unnecessary second fish-preview renderer.
- River selection no longer remains pinned to the initial basin. Nested dialogs preserve Escape/focus behavior.
- The Arulius model links to the sourced `Dawkinsia arulius` profile. Other visual studies remain explicitly separate from verified basin records; conflicting unsourced Arulius study text was removed.
- Public navigation does not prefetch the heavyweight exhibit route. Graphics code loads when the visitor chooses the exhibit instead of competing with the initial public page.

[Detailed immersion report](../.taste-skill/immersion-report.md). Models and habitats remain **illustrative, not verified scientific reconstructions**; existing non-native/reference studies are not presented as a native-fauna checklist.

## Technical SEO

- Retained existing route contracts and static generation from the catalog. Production build generates 51 outputs, including social images; this is not a claim of 51 content pages.
- Final canonical origin is `https://www.discovernativewaters.com`. Live checks found the bare host redirects there with HTTP 308; canonical, sitemap, robots and social URLs now agree with that destination.
- Meaningful homepage, basin, species and guide HTML is independent of WebGL execution. Public pages retain unique titles/descriptions, canonical URLs, headings, breadcrumbs/internal links and social metadata.
- Corrected schema.org types/properties: scientific names use `Taxon.name`; removed invalid standalone annotations and unsupported license/publication claims; retained evidence-backed geography and Dataset scope.
- Added a focused production validator checking metadata/schema, canonical destinations, sitemap/robots, social images, links/anchors and unknown-route status codes.
- Final no-JavaScript production crawl: **26/26 canonical pages, 51 requests, zero failures**. [Machine-readable result](../.taste-skill/after/seo-production.json).
- Official Schema.org code-input validation: homepage, Ganga, Rohu and field guide each returned **zero errors and zero warnings**. Google Rich Results returned **three valid items** for Rohu, with an optional Article-image recommendation. No unverified article image was invented to silence it.
- External code-input validation preceded the bare-host → www correction; the final corrected output passed the local production validator. This is not a claim that Google has crawled or indexed the new build.

[SEO report and primary-source references](../.taste-skill/seo-report.md); [validator evidence](../.taste-skill/after/external-schema.json); [Google result](https://search.google.com/test/rich-results/result?id=4XNCp1BzPcPtsDhjsCwYkA).

## Build, tests and inspections

| Check | Observed result |
| --- | --- |
| Latest production build | Pass; 51 generated outputs |
| TypeScript | Pass |
| Full ESLint | Zero errors; two pre-existing unused-import warnings in `riverProfiles.test.ts` |
| Latest changed-file ESLint | Pass |
| Integrated unit suite | 44 files / 439 tests passed |
| Canonical/schema/validator follow-up | 3 files / 27 tests passed; overlaps the suite count above |
| Browser verification | All 48 applicable scenarios verified across full run plus focused follow-up; details below |
| TasteSkill source | Before: 22 FAIL / 14 WARN. After: 0 FAIL / 10 WARN |
| TasteSkill browser | Before: 7 FAIL / 7 WARN. After: 0 FAIL / 3 WARN |
| Responsive inspection | 1440, 768 and 390px; no horizontal overflow in measured home/reference/exhibit states |

Browser accounting: the final broad run had 47 passes, six desktop skips for mobile-only cases and one obsolete mobile locator assertion. In follow mode the picker is intentionally hidden; the visible selected-fish panel correctly retained Albino Zebra Danio after changing quality. The assertion was updated to verify that visible consumer contract; both desktop/touch keyboard journeys then passed. **The initial full run was not clean.** [Full log](../.taste-skill/after/browser-tests.txt), [focused follow-up](../.taste-skill/after/journey-regression.txt), [verification record](../.taste-skill/after/verification.txt).

Coverage includes homepage → Cauvery → exhibit → Arulius → indexable profile → basin; direct species entry without JavaScript; all basin/species HTML; portrait controls; keyboard/focus; reduced motion; model/chunk/shader failures; WebGL denial/context recovery; pause/visibility/resume; audio rejection; cached re-entry and sustained live rendering. Full Chromium replaced headless-shell after the latter's screenshot capture itself exceeded assertion deadlines. Local Vercel analytics requests were corrected at their source rather than filtered out of error assertions.

TasteSkill warnings retained deliberately: no unrelated video presented as documentary footage; tablet alignment reflects three plate columns and inset reading panels; mobile hierarchy uses eleven computed sizes. Source warnings cover outlined controls, inherited fish-study wording and citation punctuation. All seven final screenshot sheets were visually reviewed. Two fresh-context code reviews found no high/medium findings.

## Performance interpretation

Production targets remain **LCP ≤ 2.5s, INP ≤ 200ms and CLS ≤ 0.1 at the 75th percentile of real users**. Lighthouse is a lab measurement, not evidence that those field targets are met; TBT is not INP.

Measurements use Lighthouse 13.6.0 against the local production server: mobile simulated throttling (150ms RTT, 1,638.4kbps throughput, 4× CPU slowdown) and the desktop preset. Baseline is the fetched base build, not a historical field-data sample. Raw [before reports](../.taste-skill/before/) and [after reports](../.taste-skill/after/) include JSON and HTML.

| Sample | Build | Perf | A11y | Best | SEO | LCP (s) | TBT (ms) | CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home mobile | Before | 82 | 89 | 96 | 100 | 4.767 | 85 | 0 |
| Home mobile | After | 95 | 100 | 100 | 100 | 2.966 | 25.5 | 0 |
| Home desktop | Before | 100 | 89 | 96 | 100 | 0.492 | 0 | 0 |
| Home desktop | After | 100 | 100 | 100 | 100 | 0.596 | 0 | 0 |
| Rohu mobile | Before | 100 | 91 | 96 | 100 | 0.912 | 37 | 0 |
| Rohu mobile | After | 99 | 100 | 100 | 100 | 1.965 | 27.5 | 0 |

**The homepage mobile lab LCP remains above the production target.** The richer Rohu reading-first page also has a higher LCP than its former sparse/split first viewport; not every metric improved. Validate hero delivery through the production CDN and real mobile devices before claiming the p75 goal. No Lighthouse score is substituted for field INP.

The final checks recorded **zero requests for the previously prefetched 197KB graphics chunk** on all three public samples. The optimized font transfers about 35KB rather than about 90KB. Explicit homepage → exhibit navigation still reaches the exploring state once its assets are ready. [Performance summary](../.taste-skill/after/performance-summary.json), [entry screenshot](../.taste-skill/after/deferred-entry-desktop.png). Earlier optimization measurements remain in `performance-refinement/`, `font-refinement/` and `prefetch-refinement/` rather than being presented as final results.

Graphics observations used actual Chrome/ANGLE Metal on an Apple M1 Pro: 120 animation-frame intervals per viewport, mean approximately 16.55ms and p95 ≤16.8ms at 1440×900, 768×1024 and 390×844. This short, cache-warm rAF sample is not a GPU frame-presentation guarantee or a physical-phone benchmark. Touch emulation used the same Mac GPU. HIGH requested seven models; LOW tablet/mobile requested four. [Measurements](../.taste-skill/after/webgl-observations.json).

Direct Rohu visits at all three sizes mounted **zero canvases and requested zero GLB models**. [HTML-first browser evidence](../.taste-skill/after/html-first-browser.json).

## Before-and-after screenshots

All links point to saved local evidence. Species comparison uses **Rohu on both sides**; separate Arulius captures document the model-linked profile. Baseline underwater capture has DPR2 while final captures use DPR1; compare composition, not raw pixel dimensions.

| Surface | Before | After |
| --- | --- | --- |
| Homepage desktop | [Before](../.taste-skill/before/desktop-fold.jpg) | [After](../.taste-skill/after/desktop-fold.jpg) |
| Homepage tablet | [Before](../.taste-skill/before/tablet-fold.jpg) | [After](../.taste-skill/after/tablet-fold.jpg) |
| Homepage mobile | [Before](../.taste-skill/before/mobile-fold.jpg) | [After](../.taste-skill/after/mobile-fold.jpg) |
| Cauvery desktop | [Before](../.taste-skill/before/basin-desktop.png) | [After](../.taste-skill/after/basin-desktop-fold.png) |
| Cauvery mobile | [Before](../.taste-skill/before/basin-mobile.png) | [After](../.taste-skill/after/basin-mobile-fold.png) |
| Rohu desktop | [Before](../.taste-skill/before/species-desktop.png) | [After](../.taste-skill/after/rohu-desktop-fold.png) |
| Rohu mobile | [Before](../.taste-skill/before/species-mobile.png) | [After](../.taste-skill/after/rohu-mobile-fold.png) |
| Field guide desktop | [Before](../.taste-skill/before/guide-desktop.png) | [After](../.taste-skill/after/guide-desktop-fold.png) |
| Field guide mobile | [Before](../.taste-skill/before/guide-mobile.png) | [After](../.taste-skill/after/guide-mobile-fold.png) |
| Underwater desktop | [Before](../.taste-skill/before/underwater-desktop.png) | [After](../.taste-skill/after/underwater-desktop.png) |

Additional tablet reference, full-page, mobile/tablet underwater and following-state captures are in `.taste-skill/after/`. The final type-payload optimization retained the same normal-width glyphs and composition; the final homepage sheets show that font build.

## Deployment and Search Console checks

1. Deploy the reviewed branch through the existing release process; preserve redirects and static assets. Run `node scripts/validate-seo.mjs https://www.discovernativewaters.com` against the deployed result.
2. In [Google Search Console](https://search.google.com/search-console), add/confirm the Domain property `discovernativewaters.com`. The domain owner must publish Google's exact DNS verification record; no credentials or DNS changes were attempted here.
3. Submit `https://www.discovernativewaters.com/sitemap.xml` in Sitemaps. Confirm it is fetched successfully and contains only intended canonical URLs.
4. URL Inspection: check `/`, `/field-guide`, `/basins/ganga` and `/species/labeo-rohita`. Compare user-declared and Google-selected canonicals; inspect rendered HTML/resources and live indexing eligibility.
5. After deployment issues are resolved, request indexing for those representative priority pages. The sitemap/internal links support discovery of the rest; repeatedly requesting every URL is not an indexing strategy.
6. Monitor Page Indexing, sitemap processing and Core Web Vitals. Assess real-user p75 once sufficient field data exists, including the rolling 28-day reporting window. Use privacy-appropriate real-user measurements to evaluate INP; lab TBT alone cannot certify it.

Indexing, rich-result appearance and rankings are not guaranteed.

## Remaining limitations and next improvements

- No physical Android/iPhone GPU, thermal or touchscreen certification; touch emulation is explicitly labelled. Validate the exhibit on representative lower-powered devices and real slower networks before release.
- No post-deployment real-user p75 data, Search Console access or indexing action. Field performance targets remain unverified.
- Archival imagery is limited; Rohu's plate is faint and is not a modern identification photograph. Commission/license verified species photography rather than substituting unrelated fish or generated scientific imagery.
- Existing models/reference studies are illustrative; scientific verification of each model and habitat is outside the available catalog evidence. Do not remove those disclosures.
- Google recommends an optional Article image; Lighthouse reports an unscored production source-map warning. Neither was hidden or filled with fabricated data.
- Three explained TasteSkill browser warnings, ten source warnings and two inherited ESLint warnings remain; the final critique does not claim flawless design or accessibility certification.
- Existing catalog size is five basins/thirteen species. Route generation scales from that catalog, but publication should remain evidence-led rather than multiplying thin pages.
