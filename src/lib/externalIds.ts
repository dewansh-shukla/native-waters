// Verified external identifiers for catalog species and rivers, used to populate
// schema.org `sameAs` links. RULE: never fabricate a URL or QID. Only entries
// backed by a real, verifiable source are included; when in doubt, omit the key.
// A missing sameAs is always better than a 404 or a wrong identifier.

export const SPECIES_EXTERNAL_IDS: Record<string, { fishbase: string; wikipedia?: string; wikidata?: string }> = {
  'labeo-rohita': {
    fishbase: 'https://www.fishbase.se/summary/Labeo-rohita.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Labeo_rohita',
    wikidata: 'Q311727',
  },
  'labeo-calbasu': {
    fishbase: 'https://www.fishbase.se/summary/Labeo-calbasu.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Labeo_calbasu',
    wikidata: 'Q141880',
  },
  'tor-remadevii': {
    fishbase: 'https://www.fishbase.se/summary/Tor-remadevii.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Tor_remadevii',
    wikidata: 'Q5713492',
  },
  'dawkinsia-arulius': {
    fishbase: 'https://www.fishbase.se/summary/Dawkinsia-arulius.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Dawkinsia_arulius',
    wikidata: 'Q28148954',
  },
  'labeo-kontius': {
    fishbase: 'https://www.fishbase.se/summary/Labeo-kontius.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Labeo_kontius',
    wikidata: 'Q2465849',
  },
  'hemibagrus-punctatus': {
    fishbase: 'https://www.fishbase.se/summary/Hemibagrus-punctatus.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Hemibagrus_punctatus',
    wikidata: 'Q6412556',
  },
  'glyptothorax-poonaensis': {
    fishbase: 'https://www.fishbase.se/summary/Glyptothorax-poonaensis.html',
    // No English Wikipedia article exists for this species.
    wikidata: 'Q6432239',
  },
  'badis-badis': {
    fishbase: 'https://www.fishbase.se/summary/Badis-badis.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Badis_badis',
    wikidata: 'Q882379',
  },
  'badis-blosyrus': {
    fishbase: 'https://www.fishbase.se/summary/Badis-blosyrus.html',
    // No English Wikipedia article exists for this species.
    wikidata: 'Q6422602',
  },
  'dawkinsia-rubrotinctus': {
    fishbase: 'https://www.fishbase.se/summary/Dawkinsia-rubrotinctus.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Dawkinsia_rubrotinctus',
    wikidata: 'Q1178720',
  },
  'hypselobarbus-dubius': {
    fishbase: 'https://www.fishbase.se/summary/Hypselobarbus-dubius.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Hypselobarbus_dubius',
    wikidata: 'Q971728',
  },
  'hypselobarbus-micropogon': {
    fishbase: 'https://www.fishbase.se/summary/Hypselobarbus-micropogon.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Hypselobarbus_micropogon',
    wikidata: 'Q3759871',
  },
  'kantaka-brevidorsalis': {
    fishbase: 'https://www.fishbase.se/summary/Kantaka-brevidorsalis.html',
    wikipedia: 'https://en.wikipedia.org/wiki/Kantaka_brevidorsalis',
    wikidata: 'Q3754800',
  },
};

export const RIVER_EXTERNAL_IDS: Record<string, { wikipedia: string; wikidata?: string }> = {
  ganga: {
    wikipedia: 'https://en.wikipedia.org/wiki/Ganges',
    wikidata: 'Q5089',
  },
  brahmaputra: {
    wikipedia: 'https://en.wikipedia.org/wiki/Brahmaputra_River',
    wikidata: 'Q45403',
  },
  cauvery: {
    wikipedia: 'https://en.wikipedia.org/wiki/Kaveri',
    wikidata: 'Q216239',
  },
  krishna: {
    wikipedia: 'https://en.wikipedia.org/wiki/Krishna_River',
    wikidata: 'Q193499',
  },
  godavari: {
    wikipedia: 'https://en.wikipedia.org/wiki/Godavari_River',
    wikidata: 'Q191314',
  },
};