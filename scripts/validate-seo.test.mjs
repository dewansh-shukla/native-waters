// @vitest-environment node
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { audit, validateHtml, validateSitemap, validateRobots } from './validate-seo.mjs';

const origin = 'https://www.discovernativewaters.com';
const canonical = `${origin}/species/labeo-rohita`;
const options = { canonical, requiredText: ['Labeo rohita'], requiredTypes: ['Taxon'] };
const page = (schema = { '@context': 'https://schema.org', '@type': 'Taxon', name: 'Labeo rohita' }, content = '<h1>Rohu</h1><p>Labeo rohita</p>') => `<!doctype html><html lang="en"><head><title>Rohu | Native Waters</title><meta name="description" content="A sourced record"><link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}"><meta property="og:title" content="Rohu"><meta property="og:description" content="A sourced record"><meta property="og:image" content="${origin}/opengraph-image"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Rohu"><meta name="twitter:description" content="A sourced record"><meta name="twitter:image" content="${origin}/opengraph-image"></head><body><main>${content}<a href="/field-guide#cauvery">Guide</a></main><script type="application/ld+json">${JSON.stringify(schema)}</script></body></html>`;

describe('production SEO validator', () => {
  it('accepts readable HTML and extracts links without executing scripts', () => {
    const result = validateHtml(page() + '<script>throw new Error("must not execute")</script>', options);
    expect(result.issues).toEqual([]);
    expect(result.links).toContain(`${origin}/field-guide#cauvery`);
    expect(result.images).toEqual([`${origin}/opengraph-image`]);
  });

  it('normalizes the origin slash without accepting a different canonical path', () => {
    const html = page().replaceAll(canonical, origin);
    expect(validateHtml(html, { ...options, canonical: `${origin}/` }).issues).toEqual([]);
    expect(validateHtml(html, options).issues).toContain(`Canonical must be ${canonical}`);
  });

  it('does not mistake script or hidden text for no-JS reference content', () => {
    const result = validateHtml(page(undefined, '<h1>Rohu</h1><div hidden>Labeo rohita</div><script>Labeo rohita</script>'), options);
    expect(result.issues).toContain('Missing no-JS text: Labeo rohita');
  });

  it('detects incorrect canonicals, robots directives and missing internal discovery links', () => {
    const html = page().replace('<head>', '<head><meta name="robots" content="noindex">').replace(`href="${canonical}"`, `href="${origin}/"`);
    const result = validateHtml(html, { ...options, requiredLinks: ['/basins/ganga'] });
    expect(result.issues).toContain(`Canonical must be ${canonical}`);
    expect(result.issues).toContain('Indexing blocked by robots meta');
    expect(result.issues).toContain('Missing HTML link: /basins/ganga');
  });

  it('rejects contextless standalone speakable, invalid Taxon properties and prose licenses', () => {
    const result = validateHtml(page([
      { '@type': 'SpeakableSpecification', cssSelector: ['h1'] },
      { '@context': 'https://schema.org', '@type': 'Taxon', name: 'Rohu', scientificName: 'Labeo rohita', isPartOf: {} },
      { '@context': 'https://schema.org', '@type': 'Dataset', license: 'See the citations' },
    ]), options);
    expect(result.issues).toEqual(expect.arrayContaining([
      'JSON-LD root is missing schema.org context',
      'SpeakableSpecification must not be a standalone entity',
      'Taxon uses unsupported property: scientificName',
      'Taxon uses unsupported property: isPartOf',
      'Dataset license must identify a license URL or CreativeWork',
    ]));
  });

  it('rejects malformed JSON and duplicate anchor IDs', () => {
    const html = page().replace('"@context"', 'BROKEN').replace('<h1>', '<span id="record"></span><span id="record"></span><h1>');
    const result = validateHtml(html, options);
    expect(result.issues).toEqual(expect.arrayContaining(['Invalid JSON-LD JSON', 'Duplicate HTML id: record']));
  });

  it('accepts a contextual graph and rejects a contextless node array', () => {
    expect(validateHtml(page({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Taxon', name: 'Labeo rohita' }] }), options).issues).toEqual([]);
    expect(validateHtml(page([{ '@type': 'Taxon', name: 'Labeo rohita' }]), options).issues).toContain('JSON-LD root is missing schema.org context');
  });

  it('requires exact unique canonical sitemap membership', () => {
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>`;
    expect(validateSitemap(xml, [`${origin}/`]).issues).toEqual([]);
    expect(validateSitemap(xml, [canonical]).issues).toEqual(expect.arrayContaining([`Missing sitemap URL: ${canonical}`, `Unexpected sitemap URL: ${origin}/`]));
    expect(validateSitemap(xml.replace('</urlset>', `<url><loc>${origin}/</loc></url></urlset>`), [`${origin}/`]).issues).toContain(`Duplicate sitemap URL: ${origin}/`);
    expect(validateSitemap('<broken>', [canonical]).issues).toContain('Invalid sitemap XML');
  });

  it('checks sitemap advertising and accidental crawl exclusions', () => {
    const sitemap = `${origin}/sitemap.xml`;
    expect(validateRobots(`User-agent: *\nAllow: /\nSitemap: ${sitemap}`, sitemap)).toEqual([]);
    expect(validateRobots(`User-agent: *\nDisallow:\nSitemap: ${sitemap}`, sitemap)).toEqual([]);
    expect(validateRobots('User-agent: *\nDisallow: /species/', sitemap)).toEqual(expect.arrayContaining(['Missing production sitemap directive', 'Unexpected robots exclusion: /species/']));
  });

  it('reports real HTTP failures and soft 404s instead of treating responses as success', async () => {
    const server = createServer((request, response) => {
      response.writeHead(request.url.includes('__seo_unknown') ? 200 : 503, { 'Content-Type': 'text/plain' });
      response.end('Unavailable');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const result = await audit(`http://127.0.0.1:${server.address().port}`);
      expect(result.passed).toBe(false);
      expect(result.expectedPages).toBe(46);
      expect(result.checkedRequests).toBe(51);
      expect(result.failures).toContainEqual({ path: '/species/labeo-rohita', issue: 'Expected 200, received 503' });
      expect(result.failures).toContainEqual({ path: '/basins/__seo_unknown_basin__', issue: 'Unknown URL must return 404, received 200' });
    } finally {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
