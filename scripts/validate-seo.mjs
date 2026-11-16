import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const ORIGIN = 'https://www.discovernativewaters.com';
const normalize = text => text.replace(/\s+/g, ' ').trim();
const isHttpUrl = value => typeof value === 'string' && /^https?:\/\//.test(value) && URL.canParse(value);
const sameUrl = (value, expected) => isHttpUrl(value) && new URL(value).href === new URL(expected).href;

// Focused project regressions, not a substitute for the schema.org validator.
function checkSchema(node, issues, types) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(value => checkSchema(value, issues, types));
    return;
  }
  const nodeTypes = [node['@type']].flat().filter(Boolean);
  nodeTypes.forEach(type => types.add(type));
  if (nodeTypes.includes('Taxon')) {
    for (const property of ['scientificName', 'isPartOf']) {
      if (property in node) issues.push(`Taxon uses unsupported property: ${property}`);
    }
  }
  if ('license' in node) {
    for (const license of [node.license].flat()) {
      if (!isHttpUrl(license) && !(license && typeof license === 'object' && license['@type'] === 'CreativeWork' && isHttpUrl(license.url))) {
        issues.push(`${nodeTypes[0] ?? 'Entity'} license must identify a license URL or CreativeWork`);
      }
    }
  }
  for (const key of ['datePublished', 'dateModified']) {
    if (key in node && (!Number.isFinite(Date.parse(node[key])) || Date.parse(node[key]) > Date.now())) issues.push(`Invalid or future ${key}`);
  }
  if (nodeTypes.includes('BreadcrumbList')) {
    const items = node.itemListElement;
    if (!Array.isArray(items) || !items.length || items.some((item, i) => item.position !== i + 1 || !item.name || !isHttpUrl(item.item))) {
      issues.push('BreadcrumbList requires ordered, named, absolute links');
    }
  }
  Object.values(node).forEach(value => checkSchema(value, issues, types));
}

export function validateHtml(html, { canonical, requiredText = [], requiredLinks = [], requiredTypes = [], requireHeading = true }) {
  // JSDOM defaults leave JavaScript and subresource loading disabled.
  const dom = new JSDOM(html, { url: canonical });
  const { document } = dom.window;
  const issues = [];
  const meta = selector => document.querySelector(selector)?.getAttribute('content')?.trim();
  const title = document.title.trim();
  if (!title) issues.push('Missing title');
  if (!meta('meta[name="description"]')) issues.push('Missing description');
  const canonicals = document.querySelectorAll('link[rel="canonical"]');
  if (canonicals.length !== 1 || !sameUrl(canonicals[0].getAttribute('href'), canonical)) issues.push(`Canonical must be ${canonical}`);
  for (const tag of document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')) {
    if (/\b(noindex|none)\b/i.test(tag.content)) issues.push('Indexing blocked by robots meta');
  }
  if (!sameUrl(meta('meta[property="og:url"]'), canonical)) issues.push('Open Graph URL must match canonical');
  for (const field of ['og:title', 'og:description', 'og:image']) {
    if (!meta(`meta[property="${field}"]`)) issues.push(`Missing ${field}`);
  }
  for (const field of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!meta(`meta[name="${field}"]`)) issues.push(`Missing ${field}`);
  }
  const images = [...new Set([...document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]')].map(tag => tag.content))];
  for (const image of images) if (!isHttpUrl(image)) issues.push(`Social image must be absolute: ${image}`);
  const types = new Set();
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (!scripts.length) issues.push('Missing JSON-LD');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      for (const root of [data].flat()) {
        if (!root || !['https://schema.org', 'https://schema.org/'].includes(root['@context'])) issues.push('JSON-LD root is missing schema.org context');
        if (root?.['@type'] === 'SpeakableSpecification') issues.push('SpeakableSpecification must not be a standalone entity');
      }
      checkSchema(data, issues, types);
    } catch {
      issues.push('Invalid JSON-LD JSON');
    }
  }
  for (const type of requiredTypes) if (!types.has(type)) issues.push(`Missing JSON-LD type: ${type}`);
  const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) issues.push(`Duplicate HTML id: ${id}`);
    seen.add(id);
  }
  document.querySelectorAll('script, style, template, [hidden], [aria-hidden="true"]').forEach(element => element.remove());
  if (requireHeading && document.querySelectorAll('h1').length !== 1) issues.push('Expected one readable h1');
  const text = normalize(document.body.textContent ?? '');
  for (const expected of requiredText) if (!text.includes(normalize(expected))) issues.push(`Missing no-JS text: ${expected}`);
  const links = [...document.querySelectorAll('a[href]')].map(link => link.href);
  for (const path of requiredLinks) {
    if (!links.includes(new URL(path, canonical).href)) issues.push(`Missing HTML link: ${path}`);
  }
  dom.window.close();
  return { issues: [...new Set(issues)], title, links, images, ids, types: [...types] };
}

export function validateSitemap(xml, expectedUrls) {
  const issues = [];
  let urls = [];
  try {
    const dom = new JSDOM(xml, { contentType: 'application/xml' });
    const document = dom.window.document;
    if (document.documentElement.localName !== 'urlset' || document.documentElement.namespaceURI !== 'http://www.sitemaps.org/schemas/sitemap/0.9') issues.push('Expected sitemap urlset namespace');
    urls = [...document.querySelectorAll('url > loc')].map(node => node.textContent.trim());
    for (const date of document.querySelectorAll('lastmod')) {
      if (!Number.isFinite(Date.parse(date.textContent)) || Date.parse(date.textContent) > Date.now()) issues.push(`Invalid or future sitemap lastmod: ${date.textContent}`);
    }
    dom.window.close();
  } catch {
    issues.push('Invalid sitemap XML');
  }
  const seen = new Set();
  for (const url of urls) {
    if (seen.has(url)) issues.push(`Duplicate sitemap URL: ${url}`);
    seen.add(url);
    if (!expectedUrls.includes(url)) issues.push(`Unexpected sitemap URL: ${url}`);
  }
  for (const url of expectedUrls) if (!seen.has(url)) issues.push(`Missing sitemap URL: ${url}`);
  return { issues, urls };
}

export function validateRobots(text, sitemap) {
  const issues = [];
  if (!text.split(/\r?\n/).some(line => line.trim().toLowerCase() === `sitemap: ${sitemap}`.toLowerCase())) issues.push('Missing production sitemap directive');
  for (const match of text.matchAll(/^[ \t]*disallow:[ \t]*([^\r\n#]*)/gim)) {
    if (match[1].trim()) issues.push(`Unexpected robots exclusion: ${match[1].trim()}`);
  }
  return issues;
}

export async function audit(baseUrl) {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.pathname !== '/' || base.search || base.hash) throw new Error('Supply an HTTP(S) origin without a path, query or fragment');
  const catalog = JSON.parse(await readFile(new URL('../content/catalog/freshwater.json', import.meta.url), 'utf8'));
  const routes = ['/', '/field-guide', '/method', '/privacy', '/experience', '/experience/ganga', '/experience/godavari', '/experience/brahmaputra', ...catalog.rivers.map(r => `/basins/${r.id}`), ...catalog.species.map(s => `/species/${s.id}`)];
  const expectedUrls = routes.map(path => `${ORIGIN}${path}`);
  const failures = [];
  const pages = new Map();
  const cache = new Map();
  const record = (path, issues) => issues.forEach(issue => failures.push({ path, issue }));
  async function request(url) {
    const source = new URL(url, ORIGIN);
    const local = new URL(`${source.pathname}${source.search}`, base);
    const key = local.href;
    if (!cache.has(key)) cache.set(key, (async () => {
      try {
        const response = await fetch(local, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
        const contentType = response.headers.get('content-type') ?? '';
        const text = /text\/|xml|json/.test(contentType) ? await response.text() : '';
        if (!text) await response.body?.cancel();
        return { status: response.status, contentType, text, robots: response.headers.get('x-robots-tag') ?? '' };
      } catch (error) {
        return { status: 0, contentType: '', text: '', robots: '', error: error.message };
      }
    })());
    return cache.get(key);
  }
  for (const path of ['/sitemap.xml', '/robots.txt', ...routes]) {
    const response = await request(path);
    if (response.status !== 200) {
      record(path, [`Expected 200, received ${response.status}${response.error ? `: ${response.error}` : ''}`]);
      continue;
    }
    if (/\b(noindex|none)\b/i.test(response.robots)) record(path, ['Indexing blocked by X-Robots-Tag']);
    if (path === '/sitemap.xml') {
      record(path, validateSitemap(response.text, expectedUrls).issues);
      continue;
    }
    if (path === '/robots.txt') {
      record(path, validateRobots(response.text, `${ORIGIN}/sitemap.xml`));
      continue;
    }
    if (!response.contentType.includes('text/html')) record(path, ['Expected HTML content type']);
    const river = catalog.rivers.find(r => path === `/basins/${r.id}`);
    const species = catalog.species.find(s => path === `/species/${s.id}`);
    const requiredText = river ? [river.name, river.summary, river.scope] : species ? [species.commonName, species.scientificName, species.summary] : [];
    const requiredLinks = path === '/' ? catalog.rivers.map(r => `/basins/${r.id}`) : path === '/field-guide' ? [...catalog.species.map(s => `/species/${s.id}`), ...catalog.rivers.map(r => `/basins/${r.id}`)] : [];
    if (river) requiredLinks.push(...catalog.species.filter(s => s.associations.some(a => a.riverId === river.id)).map(s => `/species/${s.id}`));
    if (species) requiredLinks.push(...species.associations.map(a => `/basins/${a.riverId}`));
    const requiredTypes = ['WebSite', ...(river ? ['BodyOfWater', 'BreadcrumbList'] : species ? ['Taxon', 'BreadcrumbList'] : path === '/field-guide' ? ['CollectionPage', 'Dataset'] : path.startsWith('/experience') ? ['WebApplication'] : [])];
    const page = validateHtml(response.text, { canonical: `${ORIGIN}${path}`, requiredText, requiredLinks, requiredTypes, requireHeading: !path.startsWith('/experience') });
    pages.set(path, page);
    record(path, page.issues);
  }
  const internalOrigins = new Set([ORIGIN, base.origin]);
  const imageUrls = new Set();
  for (const [path, page] of pages) {
    page.images.forEach(image => imageUrls.add(image));
    for (const href of new Set(page.links)) {
      if (!URL.canParse(href)) { record(path, [`Invalid link: ${href}`]); continue; }
      const link = new URL(href);
      if (!internalOrigins.has(link.origin)) continue;
      const response = await request(link);
      if (response.status !== 200) record(path, [`Internal link ${href} returned ${response.status}`]);
      if (link.hash && !link.hash.startsWith('#:~:text=') && response.contentType.includes('text/html')) {
        let ids = pages.get(link.pathname)?.ids;
        if (!ids) {
          const dom = new JSDOM(response.text);
          ids = [...dom.window.document.querySelectorAll('[id]')].map(node => node.id);
          dom.window.close();
        }
        let id;
        try { id = decodeURIComponent(link.hash.slice(1)); } catch { id = link.hash.slice(1); }
        if (!ids.includes(id)) record(path, [`Missing fragment target: ${href}`]);
      }
    }
  }
  for (const image of imageUrls) {
    if (!isHttpUrl(image)) continue;
    if (!internalOrigins.has(new URL(image).origin)) { record(image, ['External social image requires separate availability validation']); continue; }
    const response = await request(image);
    if (response.status !== 200 || !response.contentType.startsWith('image/')) record(image, [`Social image must return 200 image/*, received ${response.status} ${response.contentType}`]);
  }
  for (const path of ['/__seo_unknown_route__', '/species/__seo_unknown_species__', '/basins/__seo_unknown_basin__']) {
    const response = await request(path);
    if (response.status !== 404) record(path, [`Unknown URL must return 404, received ${response.status}`]);
  }
  const reached = new Set(['/']);
  const queue = ['/'];
  for (const path of queue) {
    for (const href of pages.get(path)?.links ?? []) {
      const link = new URL(href);
      if (internalOrigins.has(link.origin) && pages.has(link.pathname) && !reached.has(link.pathname)) {
        reached.add(link.pathname);
        queue.push(link.pathname);
      }
    }
  }
  for (const path of routes) if (!reached.has(path)) record(path, ['Not reachable from homepage HTML links']);
  const titles = new Map();
  for (const [path, page] of pages) {
    if (titles.has(page.title)) record(path, [`Duplicate title with ${titles.get(page.title)}`]);
    titles.set(page.title, path);
  }
  return { baseUrl: base.origin, canonicalOrigin: ORIGIN, checkedPages: pages.size, expectedPages: routes.length, checkedRequests: cache.size, noJavaScriptExecuted: true, failures, passed: failures.length === 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node scripts/validate-seo.mjs http://127.0.0.1:3000');
    const result = await audit(process.argv[2]);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.passed ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
