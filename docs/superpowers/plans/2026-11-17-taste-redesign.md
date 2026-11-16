# Native Waters TasteSkill redesign implementation plan

**State:** Complete — implementation and local validation; deployment and field-CWV certification not performed.
**Goal:** Improve the immersive freshwater museum and the independently crawlable reference library together.
**Requirements/spec:** User's complete redesign brief, 17 November 2026. Preserve Next.js/React/Three.js, existing URLs, catalog contracts, evidence and scientific limitations. Redesign homepage, basin hubs, species profiles and field guide; improve 3D atmosphere, navigation, loading, mobile controls and fallbacks; validate SEO, accessibility and performance; provide before/after evidence. No invented species facts, distribution, conservation claims or model verification.
**Coordinator/repo:** `/Users/dewanshshukla/Desktop/Personal/SAAS/native-waters-taste-redesign`, branch `feat/taste-redesign`, base `origin/setup/web-foundation` at `7935858`.
**Execution:** Parent owns visual system, public pages and integration. Independent scene and search-infrastructure slices may execute concurrently. Parent runs all checks after integration; children skip build/lint/tests/formatters. No commits, push or deployment requested.
**Approval:** User explicitly requested end-to-end implementation rather than stopping at audit/design; proceeding under that authorization with design choices recorded here.

## Review checklist
- [x] [SETUP: Install documented TasteSkill and isolate latest base](#setup)
- [x] [AUDIT: Baseline architecture, UI, SEO and performance](#audit)
- [x] [DESIGN: Three directions, inventory and chosen identity](#design)
- [x] [HOME: Homepage and river selection](#home)
- [x] [BASINS: Indexable regional hubs](#basins)
- [x] [SPECIES: Sourced natural-history profiles](#species)
- [x] [GUIDE: Scalable crawlable reference library](#guide)
- [x] [IMMERSION: Underwater experience](#immersion)
- [x] [SEO: Search infrastructure and structured data](#seo)
- [x] [ACCESS: Responsive and accessible interaction](#access)
- [x] [VERIFY: Production, journeys and visual refinement](#verify)
- [x] [PERF: Desktop/mobile lab measurements](#perf)
- [x] [DELIVER: Evidence and limitations](#deliver)

## Decisions, contracts and risks
- Keep catalog `River`, `Species`, `Association` and source IDs unchanged. An illustrative model label is not a scientific occurrence record. Link fish to a profile only when the mapping is explicit and justified; otherwise show basin records as separate sourced content.
- Keep server/static HTML for all reference pages. Three.js is opt-in on reference pages, never a rendering prerequisite. Preserve current `/experience` and named experience routes.
- Public pages use self-hosted Archivo (SIL OFL), pale mineral paper `#edf0e8`, deep river ink `#163b36`, reed accent `#d6eaa5`. Experience remains dark and uses its own scoped styles. No external animation library.
- Primary journey: homepage river selection → basin → opt-in scene → select/follow fish → sourced profile where supported → basin. Direct species entry works without JS.
- Parent owns `src/app/page*`, `src/app/globals.css`, reference components, basin/species page bodies, field guide, imagery and public typography. Scene slice owns `Experience.tsx`, scene/experience-ui components, experience behavior and a scoped experience stylesheet. SEO slice owns `src/lib/structuredData*`, search metadata infrastructure and SEO tests/scripts; coordinate shared-page callsite changes with parent.
- Search rankings/indexing cannot be promised. Lighthouse is lab evidence, not field p75 LCP/INP/CLS. Report software-rendered WebGL separately from real device claims.
- TasteSkill is pinned to v2.1.5 matching supplied documentation; current v2.5.1 changes the required workflow. The installer reported upstream risk labels; inspect instructions before use, do not install its hooks or change shared agent configuration.

<a id="setup"></a>
## SETUP
**Files:** `.agents/skills/design-taste-frontend/`, `skills-lock.json`.
**Acceptance:** Isolated branch from fetched base; project-local documented skill and dependencies available.
- [x] Fetch base, create sibling worktree (keeps base checkout untouched).
- [x] Install TasteSkill v2.1.5 via skills CLI; read its instructions.
- [x] `npm ci --no-audit --no-fund`.
**Evidence:** Base 7935858; Node v26.8.1; installed 488 packages. No shared skills or hooks modified.

<a id="audit"></a>
## AUDIT
**Files:** Existing `src/app`, `src/components`, `src/experience`, `src/lib`, `content/catalog/freshwater.json`, `tests/e2e`; evidence `.taste-skill/before/`.
- [x] Inspect route generation, dependencies, catalog validation, metadata, layout, scene loading and quality control.
- [x] Production baseline build and unit suite.
- [x] TasteSkill source lint and homepage browser inspection at 1440/768/390.
- [x] Capture representative reference/scene screenshots and baseline Lighthouse.
**Observed:** Build passes, 51 static outputs, 44 test files / 418 tests pass. Homepage has two primary links both pointing to field guide; 3D is a tertiary link. Reference pages start with a viewport-sized placeholder, pushing reading below the fold on mobile. Species preview defaults to Cauvery even for other basins. Global viewport disables zoom. Search removes focus outline and declares listbox without keyboard behavior. Structured data uses non-schema Taxon fields and unverified license text. TasteSkill baseline: 7 FAIL, 7 WARN. Actual underwater scene loads and enters; fish, floor, plants and surface render, but the horizon is abrupt and reference linkage weak.

<a id="design"></a>
## DESIGN
**Subject inventory (10):** Native Waters name; Indian freshwater focus; five named basins; thirteen curated fish records; basin-specific native/introduced/uncertain statuses; historical evidence periods distinct from sightings; coarse locations without collecting directions; actual mapped river lines and relief asset; working selectable/followable fish models; deliberate split between illustrative 3D and sourced science.
**Argument/copy deck:** Hero: “India, beneath the surface” / “Explore five river basins in 3D, then meet their freshwater fishes through sourced records.” / “Explore in 3D”, “Discover species”. Rivers: “Choose your river” / select among the five real basins, read their actual summary, open basin or scene. Species: “Meet the river’s residents” / selected named catalog records, honest archive imagery and native status. Evidence: “Curiosity, with evidence” / explain occurrence versus origin and illustration versus record; link method. Footer: Native Waters, field guide, method, privacy.
**Three dealt directions:** contact-sheet (rejected: needs dozens of assets; makes immersion a thumbnail); page-is-the-object (chosen: basin pages and species records become a living river atlas); uneven-photographs (rejected: photographic gallery does not explain the river-to-record relationship).
**Idea:** On this page, Native Waters’ five basin records become the leaves of a living river atlas, opening into the underwater exhibit.
**Live thing:** A keyboard/touch river selector with the real catalog summary and two actual destinations. Without JS, all five basin links remain present.
**Original draw:** seed 1734716076; General Sans; blush/aubergine; cropped invitation hero; output slips; pinned spines; founder letter; curtain footer.
**Adaptations:** Keep artifact composition. Replace pink/purple with river/mineral/reed colors in the same paper/ink proportions. Invitation notches, invented founder voice and multi-screen pinned text conflict with the geographic atlas, actual content and fast navigation; use atlas spread, readable record sheets and evidence notes. Slot redraws: palette, hero, `section:list=list-printed-menu-sheet`, `section:about=about-side-facts-wide-paragraph`, type. The type redraw selected Archivo: General Sans permits self-hosting but its current license prohibits font redistribution through a public repository. Archivo is bundled unmodified with its SIL OFL; retain natural sentence/scientific-name casing and normal-width text for reference readability. Existing hero is labelled illustration; licensed archive plates retain original naming caveats. No manufactured scientific images.
**Motion refinement:** The initial curtain footer obscured its own title during scroll (TasteSkill evidence). Remove pinning, reduce footer type, and retain the slow hero-art drift, quiet river-row arrivals, archival-plate entrances and control feedback. Reduced motion renders the settled state; no JavaScript reveal dependency.
- [x] Save final sheet, copy, redraw reasons and motion choices.

<a id="home"></a>
## HOME
**Files:** `src/app/page.tsx`, `page.module.css`, `src/components/home/HomeSearch.tsx`, new river-selector component/styles, shared public navigation/styles and local font/assets.
**Depends:** DESIGN. **Consumes:** unchanged catalog; produces links to existing routes.
- [x] Implement atlas spread with immediately visible 3D and field guide entry, real river selection and server-rendered links.
- [x] Preserve query search and fix visible focus, empty results, semantic result list and alias search.
- [x] Add genuine subject imagery, explicit illustration labels, credits and reduced-motion-safe feedback.
- [x] Verify keyboard, touch, no-JS links and route transitions in production browser.

<a id="basins"></a>
## BASINS
**Files:** `src/app/basins/[slug]/page.tsx`, `src/components/reference/ReferenceLayout*`, `ScenePreview.tsx`, `Evidence.tsx`.
- [x] Replace full-height split/hidden reference panel with an HTML-first atlas sheet; keep optional scene prominent but not ahead of all content on mobile.
- [x] Retain every summary, scope, citation, roster and inter-basin link.
- [x] Verify all five basin URLs, representative no-JS content, opt-in scene and mobile layout.

<a id="species"></a>
## SPECIES
**Files:** `src/app/species/[slug]/page.tsx`, reference components, imagery mapping.
- [x] Natural-history profile with scientific name, available licensed image/archival plate, basin associations, dates, references and related species.
- [x] Bind optional scene to associated basin instead of default Cauvery; do not assert that unrelated models depict the profile.
- [x] Preserve evidence limitations; no fabricated data or generic fish picture posing as verified identity.
- [x] Verify direct entry without JS, all profile URLs, related links, unknown slug 404 and social metadata.

<a id="guide"></a>
## GUIDE
**Files:** `src/app/field-guide/page.tsx`, `page.module.css`, existing guide tests.
- [x] Preserve all authored record details/citations and basin anchor URLs; replace duplicate species IDs with unique per-association anchors if needed.
- [x] Add compact species index and progressive search using existing control; readable grouped basin sections and evidence definitions.
- [x] Verify every species discoverable by HTML links, keyboard and mobile.

<a id="immersion"></a>
## IMMERSION
**Files:** `src/components/Experience.tsx`, `src/components/scene/SceneViewport.tsx`, scene world/camera files, `src/components/experience-ui/*`, `src/experience/*`, new scoped immersive CSS.
**Consumes:** existing journey reducer, quality tiers, river profile, models, catalog. **Produces:** preserved phase transitions, smoother scene and working reference links.
- [x] Audit water/floor horizon, atmospheric depth, lighting, natural motion and render allocations; improve actual environment without replacing it.
- [x] Keep appropriate LOW/HIGH assets, cleanup, pause/hidden behavior and reduced motion.
- [x] Improve loading visibility and failure routes to HTML; expose basin/profile navigation without unsupported identity claims.
- [x] Preserve keyboard selection/follow and touch use; replace blocking portrait experience with usable controls if camera fit permits.
- [x] Parent verifies load → enter → explore → follow → sourced reference → basin, failed WebGL, reduced motion and low quality.

<a id="seo"></a>
## SEO
**Files:** `src/lib/structuredData.ts`, related tests, `src/lib/reference.ts`, `src/app/robots.ts`, `sitemap.ts`, root metadata; a focused production SEO validation script if useful.
- [x] Validate schema types/properties using primary schema.org/Google references; remove unsupported standalone annotations, never invent license or author facts.
- [x] Validate canonical metadata, Open Graph, sitemap, robots, internal destinations, status codes and no accidental noindex for all canonical public pages.
- [x] Keep static generation from catalog; no thin new routes.
- [x] Parent verifies raw HTML without client execution and representative external validator access; record limitations honestly.

<a id="access"></a>
## ACCESS
**Files:** public/experience styles, layout viewport, search and controls, relevant browser tests.
- [x] Enable zoom; visible focus and skip navigation; semantic landmarks; correct labels/contrast and 44px touch controls.
- [x] Inspect 1440, 768, 390, reduced motion and WebGL failure; keep content available.

<a id="verify"></a>
## VERIFY
- [x] Run production build, TypeScript/lint and unit tests after integration.
- [x] Run relevant existing journey/reference/mobile tests, updating changed behavioral contracts rather than retaining obsolete layout assertions.
- [x] TasteSkill source/browser inspections into `.taste-skill/after`, view all captures and perform at most three refinement rounds.
- [x] Inspect complete journey and direct search landing. Fresh-context review of scene and public/SEO slices; fix blocking findings.

<a id="perf"></a>
## PERF
- [x] Lighthouse desktop/mobile baseline and after on production for homepage and representative profile; store JSON/HTML.
- [x] Observe WebGL load/interaction, asset requests and cleanup; avoid loading models on reference pages before opt-in.
- [x] Report lab LCP/CLS/TBT and distinguish INP/field data. Targets remain real-user p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; cannot certify without field collection.

<a id="deliver"></a>
## DELIVER
**Files:** `.taste-skill/` evidence, `docs/taste-redesign-results.md`, existing README where behavior changes.
- [x] Document direction, visual/3D/SEO changes, before/after screenshots, measurements, tests, scores, credits, waivers and unresolved limits.
- [x] Document Search Console domain verification, sitemap submission, representative URL inspection and requesting indexing; do not claim indexing/rank guarantees.

## Execution record
- Setup complete; baseline production server on 43188. Browser tab `native-waters-baseline` entered Cauvery water successfully.
- Baseline files `.taste-skill/before/report.json`, `source-lint.txt` and desktop/tablet/mobile screenshots.
- No LSP servers configured (tool status checked); use ordinary source inspection.
- Integrated build/typecheck passed; 44 unit files / 439 tests passed. ESLint then found one native homepage anchor, corrected to Next Link; subsequent ESLint has zero errors and two pre-existing unused-import warnings.
- Fresh-context public/SEO and immersive reviews found no high/medium issues.
- Real browser entered the improved scene. Fixed an integration bug discovered visually: CSS `:has(.scene-failure)` also matched non-rendered fallback HTML inside a healthy canvas; only real boundary failures now hide controls.
- Production refinement and browser/SEO/performance validation in progress. Initial browser suite could not load Next's server helper via Node ESM; test expected canonical origin is now declared independently. SEO validator now treats root URLs with/without `/` as equivalent, with regression coverage.
- Live HEAD requests found bare-domain 308 → www 200. Corrected canonical origin to `https://www.discovernativewaters.com` across shared metadata/schema/sitemap/robots and validation expectations, without changing paths. Earlier external schema screenshots validate the same markup structure before this host correction.
- Official Schema Markup Validator: zero errors/warnings for home, Ganga, Rohu and field guide. Google Rich Results Test: three valid Rohu items; Article has an optional missing-image recommendation, not a validation failure. No unverified species photograph added to satisfy it.
- Final www production crawl passes all 26 canonical pages and 51 requests without executing JavaScript. Root metadata, sitemap/robots, social images, internal links/anchors, structured data and unknown-route 404s checked.
- Final build generated 51 static outputs; TypeScript passes; ESLint zero errors/two existing unused-import warnings. Canonical/schema/validator focused verification passes 27 tests.
- Final TasteSkill: source 0 FAIL/10 WARN; browser 0 FAIL/3 WARN (footage, tablet grid anchors, mobile type-size count). Read all seven final screenshot sheets plus public route captures. No overflow at 1440/768/390; direct Rohu visits request no model assets and mount no canvas.
- All 48 applicable browser scenarios verified across the full run and focused follow-up (47 initially passed; obsolete hidden mobile-picker assertion replaced with the visible selected-fish panel contract; both keyboard journeys then passed). Six desktop instances of mobile-only tests intentionally skipped.
- Production WebGL observations: 120 animation-frame samples per viewport, approximately 16.55ms mean and ≤16.8ms p95 on Apple M1 Pro/ANGLE Metal. Tablet/mobile are touch emulation on that GPU, not physical-device benchmarks; cache-warm model transfers are not cold-load budgets.
- Lighthouse exposed contrast loss during opacity-based entrances; changed to transform-only motion. LCP images now load eagerly/high-priority. Removed unused font-width variation payload (normal-width Archivo 400–700 is 34,928 bytes) and preload it only on public atlas pages.
- Final measured public-page performance: home mobile 95 / LCP 2.966s; home desktop 100 / 0.596s; Rohu mobile 99 / 1.965s. Accessibility, best practices and SEO are 100 for all three; CLS is zero. Homepage mobile lab LCP remains above target, and field p75/INP remain unverified.
- Disabled exhibit-route prefetch on public navigation; final reports show zero requests for the former 197KB prefetched graphics chunk. Explicit entry after asset readiness reaches `exploring` with one canvas. Final production build/typecheck/changed-file lint and no-JS SEO validation pass.
- Delivery, screenshot comparisons, metrics, limitations and Search Console steps: [results](../../taste-redesign-results.md).
