# SEO implementation and integration report

17 November 2026. Assigned SEO slice of `docs/superpowers/plans/2026-11-17-taste-redesign.md` (SEO). Implementation and source research only; **no builds, tests, lint, formatters, production crawl or external markup validation were run by this worker**. Parent owns integrated verification.

## Parent integration correction

The later live-host check found `https://discovernativewaters.com/` returns **308 to `https://www.discovernativewaters.com/`**, which returns 200. Parent corrected `SITE_ORIGIN`, validator expectations and regression tests to the **www destination**, preserving every path. Earlier bare-host examples/results below describe the initial source audit, not the final canonical contract. Final production validation is `.taste-skill/after/seo-production.json`; final handoff is `docs/taste-redesign-results.md`.

## Changed files

- `src/lib/structuredData.ts`: Taxon uses its scientific name as `name`, retains common names/aliases and existing identity links, removes unsupported `scientificName` and `isPartOf`, and links its profile through `mainEntityOfPage`. Dataset URL now identifies `/field-guide`, where the dataset is described; removes the prose masquerading as a license without inventing replacement licensing. Deletes standalone `speakableSchema`. Article/WebPage publication and modification dates are optional. BodyOfWater now names the river (consistent with existing river sameAs URLs), links its basin page, and no longer asserts every complete river/basin is contained in India; catalog scope remains unchanged.
- `src/lib/structuredData.test.ts`: regression coverage for valid Taxon names/page relationships, river versus basin-page identity, omitted unknown license, correct dataset URL, and omission of unknown publication dates.
- `src/lib/reference.test.ts`: sitemap canonical membership, uniqueness and preservation of 13 species / 5 basins / 26 total public pages; robots sitemap advertisement.
- `src/app/privacy/page.tsx`: metadata/schema-only change authorized separately by parent. Uses `referenceMetadata` so social URL/title/description do not inherit homepage values; uses `WebPage`, not `Article`; omits fabricated publication date. Body unchanged.
- `src/app/method/page.tsx`: schema-only change authorized by parent; omits publication date previously copied from the visible review date. Body/metadata unchanged.
- `scripts/validate-seo.mjs`, `scripts/validate-seo.test.mjs`: focused raw production response validator and regression tests using native Node fetch/HTTP plus already-installed JSDOM/Vitest. No new dependencies or package scripts.
- This report.

`reference.ts`, `sitemap.ts`, `robots.ts`, `next.config.mjs`, catalog data and all canonical routes are preserved. Source inspection found no demonstrated need for new redirects, route migration, bot overrides or config changes. Sitemap already contains all 26 canonical routes; its dates are stable, not recomputed on every build. Existing changefreq/priority values are not Google ranking signals (Google ignores both).

## Parent integration requirements

1. In both `src/app/basins/[slug]/page.tsx` and `src/app/species/[slug]/page.tsx`, remove `speakableSchema` from the helper import and remove `speakableSchema(['[data-speakable]'])` from the JSON-LD array. The helper is deleted, not shimmed. The `data-speakable` attributes can also go. Parent accepted this contract.
2. Omit `datePublished` when it merely duplicates a review date in basin/species/field-guide schemas. `dateModified` may retain the supported review date. Parent accepted this contract; method/privacy already fixed here.
3. Retain root `metadataBase = new URL(SITE_ORIGIN)`, production canonicals, WebSite JSON-LD and conditional verification token. Parent reported root zoom restriction already removed. Homepage should explicitly include Native Waters in its title rather than assume its same-segment root template supplies the brand.
4. Keep all five basin links in initial homepage HTML, all 13 species links in initial field-guide HTML, basin-to-species and species-to-basin links, plus a link path from home to every sitemap page (including all four experience URLs). The validator enforces this independently of WebGL/client execution.
5. Preserve unique field-guide anchor IDs and old basin fragment IDs; the validator follows fragments, including existing `/field-guide#<basin>` URLs.
6. Update stale `docs/reference-pages.md` in parent documentation pass: it still names the old `native-waters.vercel.app` origin, claims no last-modified values, and describes the obsolete split layout. Actual canonical origin is `https://discovernativewaters.com`; do not migrate it back.

## Metadata, routes and social images inspected

- Root and every public route's metadata were inspected: homepage, field-guide, method, privacy, all four experience entry modules, and basin/species generators.
- Both reference page generators use catalog slugs, promise-based params, and `dynamicParams = false`; lookup helpers call `notFound()` for unknown records. No replacement IDs or new thin routes introduced.
- Canonical/OG URLs in shared reference metadata are production URLs. Privacy was the observed inheritance bug: it had a canonical but inherited homepage OG/Twitter content. Fixed using the existing helper.
- Root, basin and species OG code exports PNG 1200×630 images. Basin/species image generators derive slugs from the catalog and content from existing names/summaries. Metadata explicitly selects per-record image URLs; the validator fetches every unique emitted OG/Twitter image to verify an actual 200 image response.
- OG unknown-slug code has a generic fallback; public unknown profile status still comes from page routing. The required unknown public-page 404 checks are included; no new image routes/fallback claims were introduced.
- Species OG uses the first association and names its basin; this is not evidence for every basin. Parent should visually inspect long titles/badges without treating their generation as scientific verification.
- JSON-LD renderer already escapes `<` before embedding. Retained, not replaced.
- Review dates are not publication dates. Existing `CONTENT_UPDATED_AT` is an editorial review constant, not an observed crawl/deployment time. Future substantive updates must maintain truthful modification dates rather than set dates to the current build time.

## Authoritative research and decisions

- [schema.org Taxon](https://schema.org/Taxon): inherits Thing, not CreativeWork. `name`, `alternateName` and `mainEntityOfPage` apply; `scientificName` is not defined there. [isPartOf](https://schema.org/isPartOf) applies to CreativeWork, not Taxon. The scientific binomial therefore belongs in `name`; common names remain alternatives.
- [BodyOfWater](https://schema.org/BodyOfWater): identifies the water body, not its entire drainage land area. Existing Wikipedia/Wikidata references identify rivers; the helper now says river and points to the basin reference page. Removed broad India containment rather than invent geography.
- [schema.org license](https://schema.org/license) and [Google Dataset documentation](https://developers.google.com/search/docs/appearance/structured-data/dataset): license must identify a license URL or CreativeWork. A citation reminder is not a license grant. Unknown licensing stays absent. Dataset name/description remain; no author/person, DOI, license or distribution download has been fabricated.
- [Google Speakable](https://developers.google.com/search/docs/appearance/structured-data/speakable): placement is a `speakable` property on Article/WebPage, not a contextless independent node. Google's documented use is topical news, with restricted country/language availability. Removed rather than extending unsupported voice-result expectations to a fish reference.
- **Current feature status matters:** the [Google documentation changelog](https://developers.google.com/search/updates#faq-deprecation) says FAQ rich results stopped appearing on 7 May 2026; documentation was removed in June 2026. FAQPage may remain as truthful semantic markup mirroring visible FAQs, but do not promise FAQ rich results. That changelog also clarifies Dataset markup serves **Dataset Search, not Google Search rich results**. Generic schema.org entities such as Taxon/BodyOfWater do not imply a supported Google rich-result feature.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): absolute canonical URLs, truthful lastmod, no indexing guarantee. Priority and changefreq ignored by Google.
- Existing species Wikidata IDs were queried through [the Wikidata entity API](https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q311727%7CQ141880%7CQ5713492%7CQ28148954%7CQ2465849%7CQ6412556%7CQ6432239%7CQ882379%7CQ6422602%7CQ1178720%7CQ971728%7CQ3759871%7CQ3754800&props=labels&languages=en&format=json). All returned entities with fish/common-name labels; Q3754800 labels the existing older name Osteochilichthys brevidorsalis. This is identity-label research, not a fresh taxonomic revision or verification of every external page/claim. Existing identifiers retained; none invented.
- Relevant installed Next 16.4.6 docs read: metadata/OG guide, generateStaticParams, sitemap and robots file conventions. Pre-rendered pages resolve metadata at build time; no speculative `htmlLimitedBots` override added.

## Validator commands for parent

Run from the worktree root after all slices land, using the final build, not the baseline server:

```sh
npm test -- src/lib/structuredData.test.ts src/lib/reference.test.ts scripts/validate-seo.test.mjs
npm run build
npm run start -- --hostname 127.0.0.1 --port 43200
```

In a separate shell while that production server is ready:

```sh
node scripts/validate-seo.mjs http://127.0.0.1:43200 > .taste-skill/after/seo-production.json
```

The parent normally runs the integrated full unit/type/lint suite once; the focused test command above is an alternative targeted command, not a request to duplicate its whole suite. Use any already-ready final production server port instead of starting another. Ensure `.taste-skill/after` exists before redirection. CLI exits 0 only when all checks pass; exits 1 on errors and emits JSON failure paths. Preserve/report failures, do not relabel partial coverage as a pass.

After deployment, repeat against the canonical origin:

```sh
node scripts/validate-seo.mjs https://www.discovernativewaters.com > .taste-skill/after/seo-live.json
```

Coverage: exact unique sitemap membership derived from catalog + eight static routes; status/content type; self-canonical and OG canonical; meta/header noindex; page titles/descriptions and social metadata; all emitted social image status/content types; JSON-LD parsing, root contexts, expected route entity types and known schema regressions; breadcrumb URL/ordering; no future structured/sitemap dates; raw no-JS names/summaries/scope and required links; duplicate HTML IDs; internal hrefs and fragments; HTML reachability from home; duplicate titles; genuine 404 for root/basin/species unknown URLs. Redirects are not silently followed. Fetches are origin-remapped for local builds and deduplicated; no off-site citation crawling or JS execution.

Limitations: this is a focused project validator, not a full schema.org vocabulary engine, complete robots precedence parser, scientific source audit, or Googlebot simulator. It conservatively flags every nonempty robots Disallow (the site's expected policy is allow-all). It detects hidden attributes but does not evaluate external CSS visibility, rendered layout, interaction/accessibility, device GPU or client performance. Those remain parent browser checks. Local HTML can be correct while DNS, CDN headers, authentication or deployment behavior differs; hence the live run.

## External validator availability

Research GETs successfully loaded both [Schema Markup Validator](https://validator.schema.org/) and [Google Rich Results Test](https://search.google.com/test/rich-results), including their test interfaces. **No validation result was submitted or claimed.** Parent can paste final generated HTML into code-input mode before deployment, then use public URL mode after deployment. External services cannot fetch the worker's localhost. Save result screenshots/URLs for homepage, `/basins/ganga`, `/species/labeo-rohita`, and `/field-guide`. Schema Markup Validator checks broader vocabulary; Rich Results Test only evaluates supported Google features. A missing Taxon/BodyOfWater/FAQ rich-result panel is not proof of malformed JSON-LD. Never add invented fields solely to silence optional rich-result warnings.

## Search Console deployment handoff

1. An owner adds the Domain property `discovernativewaters.com` and verifies with the exact DNS TXT/CNAME token from Search Console; keep the token in DNS after verification. [Official ownership instructions](https://support.google.com/webmasters/answer/9008080). Domain verification needs DNS access. For a URL-prefix property only, the existing root `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` path can emit the owner's exact HTML-tag token after build/deploy. Never fabricate a verification value.
2. Deploy the final production build and confirm the live validator passes. Check that production is not behind preview protection and the final response has no deployment-injected noindex. Confirm alternate host/protocol redirects in hosting settings without changing stable page paths.
3. In **Sitemaps**, submit `https://www.discovernativewaters.com/sitemap.xml`; inspect processing and discovered URLs. The sitemap should include 26 canonical pages (13 species, 5 basins, 8 other pages). [Submission guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
4. In **URL Inspection**, inspect homepage, field guide, Ganga basin and Rohu profile, then representative remaining route types. Run **Test live URL**; check fetch/indexing permission, tested HTML, resource errors and screenshot. In indexed results compare user-declared and Google-selected canonical and last crawl. The live test cannot predict Google's eventual canonical selection. [Inspection guide](https://support.google.com/webmasters/answer/9012289).
5. After resolving real failures, use **Request indexing** for a few priority changed URLs; rely on sitemap discovery for the whole catalog. Owner/full-user access is required, requests are quota-limited, and repeating requests does not accelerate crawling. [Recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
6. Monitor Page indexing, sitemap processing, actual supported enhancement reports, security/manual actions and Search performance over time. Record observed crawl/indexing changes rather than promising rank improvements. Search Console/CrUX field CWV needs real traffic; local Lighthouse is not field p75 evidence.

No Search Console account, property authorization, DNS, deployment or indexed-state access was used by this worker; those actions remain owner/deployment tasks, not completed evidence. Valid metadata/markup, sitemap submission and successful live tests do not guarantee indexing, rich results or rankings.
