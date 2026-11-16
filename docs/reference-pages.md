# River and species references

Native Waters uses Next.js App Router and static generation from the validated catalog. The redesign preserves existing paths and keeps essential content independent of WebGL.

- `/`: living river atlas, river selection, sourced species links, search, and a primary 3D entry.
- `/basins/[slug]`: five regional hubs, evidence scope, citations, supported species and an optional basin-specific exhibit.
- `/species/[slug]`: thirteen sourced profiles with basin associations, evidence dates, references and honest archival imagery where available.
- `/field-guide`: all species in an HTML index, progressive search, grouped records and native expandable evidence sections.
- `/experience` and existing named experience routes: full-screen illustrative exploration.
- Unknown basin/species slugs return HTTP 404. The sitemap includes 26 canonical public pages.

`content/catalog/freshwater.json` remains the content source; `src/lib/catalog.ts` validates it. Stable scientific-name slugs and `generateStaticParams` support additional catalog records without a new routing system. Titles, descriptions, canonical/social URLs, JSON-LD and meaningful text are server-generated.

The canonical origin is `https://www.discovernativewaters.com`. A live host check on 17 November 2026 found the bare domain redirects there with HTTP 308. Shared metadata, sitemap, robots and structured data use the destination host. Review dates come from `CONTENT_UPDATED_AT`, not build time; publication dates and dataset licenses are not invented.

Reference content leads the page. Desktop has a sticky optional exhibit panel; mobile puts the readable article first with a prominent jump link to the exhibit. Opening the native fullscreen dialog loads the scene; closing it unmounts the renderer. The preview uses the record's associated river. The exact Arulius model has a sourced profile link; other illustrative models link separately to basin evidence rather than claiming a taxonomic/distribution match.

The scene retains LOW/HIGH assets, pause/reduced-motion behavior, keyboard selection and recovery. Portrait controls remain usable without mandatory rotation. Source color-space handling, water optics, particle layout and cleanup were improved. Neither model labels nor rendered habitats establish scientific occurrence.

Useful checks:

```sh
npm run typecheck
npm run lint
npm test -- --maxWorkers=2
npm run build
npx playwright test
```

Run `node scripts/validate-seo.mjs http://127.0.0.1:43200` against a ready production server (or the canonical live origin after deployment). It checks all canonical pages, no-JS content, links/fragments, social images, JSON-LD regressions, sitemap/robots and true 404s. This is not a full schema.org validator or a Google indexing guarantee. External validator evidence and measured browser/performance results are recorded in `docs/taste-redesign-results.md` and `.taste-skill/`.
