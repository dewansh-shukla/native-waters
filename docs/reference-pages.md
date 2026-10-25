# River and species references

Native Waters already uses Next.js App Router. Phase 1 adds statically generated HTML rather than introducing a new framework, database service or per-request rendering.

- `/`: basin links and reference introduction next to the original 3D experience.
- `/basins/[slug]`: five sourced river references and links to their supported fish records.
- `/species/[slug]`: thirteen named profiles with individual basin associations, evidence dates and citations.
- `/field-guide`: consolidated, cross-linked reference.
- `/experience`: the original full-screen illustrative experience remains available.
- Unknown basin/species slugs return HTTP 404. The sitemap lists only published URLs.

`content/catalog/freshwater.json` is the content source; `src/lib/catalog.ts` validates it. Slugs use stable scientific-name IDs for species. `generateStaticParams` builds every reference page. Plain HTML links, titles, descriptions, canonical and Open Graph URLs are available without WebGL. The origin remains `https://native-waters.vercel.app`; a custom domain needs a separate ownership/configuration decision. No fabricated last-modified dates are emitted.

Desktop splits the viewport 65% visual / 35% scrollable HTML. At widths up to 900px it stacks two half-height panels. The HTML panel can be focused for keyboard scrolling. Reference pages start with an abstract visual placeholder and load the existing illustrative scene only on request. That scene remains labelled Cauvery/polar-parrot reference study; it is not a model or habitat for the selected species. No species assets or husbandry parameters are invented.

The aquarium controls, reduced motion and error recovery remain intact. Tests continue to exercise the actual home-page split scene. A single existing brand assertion is scoped to the experience region because Native Waters now also appears in HTML navigation.

Useful checks:

```sh
npm run typecheck
npm run lint
npm test -- --maxWorkers=2
npm run build
npm run test:e2e
python3 -B -m unittest discover -s tools/maps -p 'test_*.py'
python3 -B -m unittest discover -s tools/assets -p 'test_*.py'
```

Browser coverage includes every direct reference path with JavaScript disabled, canonical links, genuine 404 status codes, responsive proportions, normal internal navigation, optional scene loading and the pre-existing full journey/recovery/motion suite. These checks do not establish physical mobile GPU performance or biological realism.
