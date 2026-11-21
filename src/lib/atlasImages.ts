import creditsData from '../../public/atlas/credits.json';

/**
 * Image credits live in a single machine-readable file, `/atlas/credits.json`,
 * which is also served to the public. This module adds the editorial layer:
 * which record uses which file, and the alt text and caption we stand behind.
 */

export type AtlasImageKind = 'photograph' | 'plate';

type CreditRecord = (typeof creditsData)[number];

type Usage = {
  kind: AtlasImageKind;
  alt: string;
  caption: string;
};

export type AtlasImage = {
  /** Catalog species id. */
  id: string;
  file: string;
  kind: AtlasImageKind;
  alt: string;
  caption: string;
  width: number;
  height: number;
  bytes: number;
  creator: string | null;
  date: string;
  dateLabel: string;
  license: string;
  licenseCode: string;
  licenseUrl: string;
  page: string;
  notes: string[];
};

const USAGE: Record<string, Usage & { file: string }> = {
  'labeo-rohita': {
    file: '/atlas/labeo-rohita-griesbach-plate.jpg',
    kind: 'plate',
    alt: 'Archival lithograph of a rohu in profile, labelled Labeo rohita',
    caption: 'Rohu, a plate from Francis Day’s The Fishes of India (1878), drawn by C.L. Griesbach. An archival illustration, not a modern photograph.',
  },
  'labeo-calbasu': {
    file: '/atlas/labeo-calbasu-day-mintern-126.jpg',
    kind: 'plate',
    alt: '1878 lithograph of a calbasu in profile, labelled Labeo calbasu',
    caption: 'Calbasu, a plate from Francis Day’s The Fishes of India (1878). An archival illustration; the plate’s original name is retained.',
  },
  'tor-remadevii': {
    file: '/atlas/tor-remadevii-johnsingh-mahseer.jpg',
    kind: 'photograph',
    alt: 'A hump-backed mahseer with orange fins held above shallow water during a survey',
    caption: 'A live hump-backed mahseer, caught, measured and released during a survey in India. Photographed in the hand, not collected.',
  },
  'dawkinsia-arulius': {
    file: '/atlas/dawkinsia-arulius-knight.jpg',
    kind: 'photograph',
    alt: 'A live Arulius barb with red-edged fins against a pale background',
    caption: 'A live Arulius barb. Photograph supplied by Marcus Knight; the original file carries his watermark.',
  },
  'labeo-kontius': {
    file: '/atlas/labeo-kontius-griesbach-127.jpg',
    kind: 'plate',
    alt: '1878 lithograph of Labeo kontius in profile, with a detail of its mouth',
    caption: 'Labeo kontius, a plate from The Fishes of India (1878), drawn by C.L. Griesbach. An archival illustration.',
  },
  'hemibagrus-punctatus': {
    file: '/atlas/hemibagrus-punctatus-mintern-100.jpg',
    kind: 'plate',
    alt: '1878 lithograph of a long-barbelled catfish labelled Macrones punctatus',
    caption: 'Hemibagrus punctatus, a plate from The Fishes of India (1878). The plate carries its original name, Macrones punctatus.',
  },
  'badis-badis': {
    file: '/atlas/badis-badis-das.jpg',
    kind: 'photograph',
    alt: 'A small striped blue perch facing left among aquarium plants',
    caption: 'A live blue perch in a planted aquarium. The phone-camera watermark is part of the original file.',
  },
  'dawkinsia-rubrotinctus': {
    file: '/atlas/dawkinsia-rubrotinctus-mahatvaraj.jpg',
    kind: 'photograph',
    alt: 'A live Dawkinsia rubrotinctus with a red-orange body against a pale surface',
    caption: 'A live Dawkinsia rubrotinctus. The photographer’s watermark is part of the original file.',
  },
  'hypselobarbus-dubius': {
    file: '/atlas/hypselobarbus-dubius-mintern-137.jpg',
    kind: 'plate',
    alt: '1878 lithograph of a barb in profile, labelled Barbus dubius',
    caption: 'Hypselobarbus dubius, a plate from The Fishes of India (1878). The plate carries its original name, Barbus dubius.',
  },
  'hypselobarbus-micropogon': {
    file: '/atlas/hypselobarbus-micropogon-mintern-138.jpg',
    kind: 'plate',
    alt: '1878 lithograph of a barb in profile, labelled Barbus micropogon',
    caption: 'Hypselobarbus micropogon, a plate from The Fishes of India (1878). The plate carries its original name, Barbus micropogon.',
  },
  'kantaka-brevidorsalis': {
    file: '/atlas/kantaka-brevidorsalis-achilles-133.jpg',
    kind: 'plate',
    alt: '1878 lithograph of a small cyprinid in profile, labelled Scaphiodon brevidorsalis',
    caption: 'Kantaka brevidorsalis, a plate from The Fishes of India (1878). The plate carries its original name, Scaphiodon brevidorsalis.',
  },
  'silonia-childreni': {
    file: '/atlas/silonia-childreni-sykes.jpg',
    kind: 'plate',
    alt: 'Archival 1839 illustration of Silonia childreni in profile',
    caption: 'Silonia childreni, illustrated by J. Swaine in 1839. An archival illustration, not a modern photograph.',
  },
  'hyporhamphus-xanthopterus': {
    file: '/atlas/hyporhamphus-xanthopterus-siva-naturewild.jpg',
    kind: 'photograph',
    alt: 'A red-tipped halfbeak held upright in a person’s hand',
    caption: 'A red-tipped halfbeak photographed in hand by Siva Naturewild in August 2022; this is not a habitat image.',
  },
  'wallago-attu': {
    file: '/atlas/wallago-attu-rejoice-gassah.jpg',
    kind: 'photograph',
    alt: 'A large Wallago catfish held horizontally above grass',
    caption: 'Wallago attu photographed in hand by Rejoice Gassah in 2019; this is not a habitat image.',
  },
  'botia-striata': {
    file: '/atlas/botia-striata-lerdsuwa.jpg',
    kind: 'photograph',
    alt: 'A zebra loach with dark vertical stripes resting on aquarium gravel',
    caption: 'A zebra loach photographed in an aquarium by Lerdsuwa in 2007; this is not a habitat image.',
  },
  'tor-putitora': {
    file: '/atlas/tor-putitora-charles-sharp.jpg',
    kind: 'photograph',
    alt: 'Golden mahseer swimming underwater in the Babai River, Nepal',
    caption: 'Golden mahseer photographed in the Babai River, Nepal, by Charles J. Sharp in 2019; this is not a Ganga-basin image.',
  },
  'clupisoma-garua': {
    file: '/atlas/clupisoma-garua-biswarup-ganguly.jpg',
    kind: 'photograph',
    alt: 'Several Garua bachcha catfish together, with one shown in side profile',
    caption: 'Clupisoma garua photographed by Biswarup Ganguly in April 2002; the file does not specify a capture locality.',
  },
  'mastacembelus-armatus': {
    file: '/atlas/mastacembelus-armatus-motu-purkait.jpg',
    kind: 'photograph',
    alt: 'Close view of the head and front of a zig-zag eel held upright in a hand',
    caption: 'Close-up of a zig-zag eel photographed by Motu purkait in 2026; this is not a habitat image.',
  },
};

const BY_FILE = new Map<string, CreditRecord>(creditsData.map(record => [record.file, record]));

/** A four-digit year when the source states one, otherwise the source wording. */
function dateLabel(date: string): string {
  const year = /^(\d{4})/.exec(date);
  return year ? year[1] : date;
}

function toImage(id: string, usage: Usage & { file: string }): AtlasImage | undefined {
  const record = BY_FILE.get(usage.file);
  if (!record) return undefined;
  return {
    id,
    file: usage.file,
    kind: usage.kind,
    alt: usage.alt,
    caption: usage.caption,
    width: record.width,
    height: record.height,
    bytes: record.bytes,
    creator: record.creator,
    date: record.date,
    dateLabel: dateLabel(record.date),
    license: record.license,
    licenseCode: record.licenseCode,
    licenseUrl: record.licenseUrl,
    page: record.page,
    notes: record.notes,
  };
}

/** The image for a species, or undefined when no suitable licensed file exists. */
export function atlasImage(id: string): AtlasImage | undefined {
  const usage = USAGE[id];
  return usage ? toImage(id, usage) : undefined;
}

/** Every species image, in catalog-adjacent order. */
export function atlasImages(): AtlasImage[] {
  return Object.entries(USAGE)
    .map(([id, usage]) => toImage(id, usage))
    .filter((image): image is AtlasImage => image !== undefined);
}

/** What kind of record this is, as a reader-facing noun. */
export function imageKindLabel(image: AtlasImage): string {
  return image.kind === 'photograph' ? 'Photograph' : 'Archival plate';
}
