import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const catalogPath = path.join(root, 'content', 'catalog', 'freshwater.json');
const outPath = path.join(root, 'public', 'llms-full.txt');

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const rivers = catalog.rivers;
const species = catalog.species;
const sources = catalog.sources;

const sourceById = new Map(sources.map((s) => [s.id, s]));
const riverById = new Map(rivers.map((r) => [r.id, r]));

const speciesForRiver = (riverId) =>
  species.filter((sp) => sp.associations.some((a) => a.riverId === riverId));

const fmtBool = (value) => (value ? 'yes' : 'no');

const lines = [];
lines.push('# Native Waters — full reference');
lines.push('');
lines.push('> Sourced reference for the native freshwater fishes of five Indian river systems (Ganga, Brahmaputra, Cauvery, Krishna, Godavari), with an illustrative underwater experience.');
lines.push('');
lines.push('Data is derived from cited publications; see the citations on each page and in the Sources section below. Species names follow the cited sources, and basin-native status is only claimed where the cited evidence supports it.');
lines.push('');

lines.push('## Rivers');
lines.push('');
for (const river of rivers) {
  lines.push(`### ${river.name}`);
  lines.push('');
  lines.push(river.summary);
  lines.push('');
  lines.push(`Scope: ${river.scope}`);
  const assocSpecies = speciesForRiver(river.id);
  lines.push(`Species records: ${assocSpecies.length}`);
  lines.push('');
  for (const sp of assocSpecies) {
    const assoc = sp.associations.find((a) => a.riverId === river.id);
    lines.push(
      `- ${sp.commonName} (${sp.scientificName}): status ${assoc.status}; basin endemic: ${fmtBool(assoc.basinEndemic)}`
    );
  }
  lines.push('');
}

lines.push('## Species');
lines.push('');
for (const sp of species) {
  lines.push(`### ${sp.commonName} (${sp.scientificName})`);
  lines.push('');
  const aliases = sp.aliases && sp.aliases.length ? sp.aliases.join(', ') : 'none';
  lines.push(`Aliases: ${aliases}`);
  lines.push('');
  lines.push(sp.summary);
  lines.push('');
  for (const assoc of sp.associations) {
    const river = riverById.get(assoc.riverId);
    const riverName = river ? river.name : assoc.riverId;
    const citationTitles = (assoc.sourceIds || [])
      .map((id) => sourceById.get(id)?.title)
      .filter(Boolean)
      .join('; ');
    lines.push(`- River: ${riverName}`);
    lines.push(`  - Status: ${assoc.status}`);
    lines.push(`  - Basin endemic: ${fmtBool(assoc.basinEndemic)}`);
    lines.push(`  - Record area: ${assoc.locality}`);
    lines.push(`  - Evidence period: ${assoc.evidencePeriod}`);
    lines.push(`  - Note: ${assoc.note}`);
    lines.push(`  - Citations: ${citationTitles}`);
  }
  lines.push('');
}

lines.push('## Sources');
lines.push('');
for (const src of sources) {
  const published = src.published ? src.published : 'not stated';
  lines.push(`- ${src.title} — ${src.url} — published: ${published}; accessed: ${src.accessed}`);
}
lines.push('');

writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`wrote public/llms-full.txt (${species.length} species, ${rivers.length} rivers)`);
