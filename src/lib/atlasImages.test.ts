import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { atlasImage, atlasImages, imageKindLabel } from './atlasImages';
import { freshwaterCatalog as catalog } from './catalog';
import credits from '../../public/atlas/credits.json';

const images = atlasImages();
const speciesIds = new Set(catalog.species.map(species => species.id));
const publicFile = (file: string) => path.join(process.cwd(), 'public', file);

describe('atlas images', () => {
  it('resolves every image to the catalog species it illustrates', () => {
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(speciesIds.has(image.id), `${image.id} is not a catalog species`).toBe(true);
      expect(atlasImage(image.id)).toStrictEqual(image);
    }
  });

  it('has no credit record without a use', () => {
    const used = new Set(images.map(image => image.file));
    const unused = credits.filter(record => !used.has(record.file)).map(record => record.file);
    // The Kaveri rapids photograph illustrates the homepage, not a species record.
    expect(unused).toEqual(['/atlas/rapids-kaveri-doddegaudana-koppalu-mandya-aug24-a7cr.jpg']);
  });

  it('ships every credited file at the size the manifest records', () => {
    for (const record of credits) {
      const file = publicFile(record.file);
      expect(existsSync(file), `${record.file} is missing from public/`).toBe(true);
      expect(statSync(file).size, `${record.file} size`).toBe(record.bytes);
    }
  });

  it('records a licence, a source page and a creator for every image', () => {
    for (const image of images) {
      expect(image.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(image.page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.alt.length).toBeGreaterThan(20);
      expect(image.caption.length).toBeGreaterThan(40);
      expect(image.caption.length).toBeLessThan(240);
      if (image.licenseCode === 'pd') expect(image.license).toBe('public domain');
      else expect(image.creator, `${image.id} needs an attribution`).toBeTruthy();
      expect(image.date.length).toBeGreaterThan(0);
    }
  });

  it('keeps archival plates and photographs apart', () => {
    for (const image of images) {
      if (image.kind === 'plate') expect(image.licenseCode).toBe('pd');
      else expect(image.licenseCode).not.toBe('pd');
      expect(['Photograph', 'Archival plate']).toContain(imageKindLabel(image));
    }
  });

  it('leaves species without a usable licensed image unillustrated', () => {
    expect(atlasImage('badis-blosyrus')).toBeUndefined();
    expect(atlasImage('glyptothorax-poonaensis')).toBeUndefined();
    expect(atlasImage('not-a-species')).toBeUndefined();
  });

  it('uses species-matched, licensed visuals for the new Cauvery records where available', () => {
    expect(atlasImage('silonia-childreni')?.kind).toBe('plate');
    expect(atlasImage('hyporhamphus-xanthopterus')?.kind).toBe('photograph');
    expect(atlasImage('wallago-attu')?.kind).toBe('photograph');
    expect(atlasImage('opsarius-gatensis')).toBeUndefined();
    expect(atlasImage('labeo-dyocheilus')).toBeUndefined();
    expect(atlasImage('channa-pseudomarulius')).toBeUndefined();
    expect(atlasImage('macrognathus-malabaricus')).toBeUndefined();
    expect(atlasImage('oryzias-carnaticus')).toBeUndefined();
  });

  it('states the year when the source records a full date', () => {
    expect(atlasImage('tor-remadevii')?.dateLabel).toBe('2016');
    expect(atlasImage('labeo-rohita')?.dateLabel).toBe('1878');
  });
});
