import Link from 'next/link';
import { atlasImages, imageKindLabel } from '@/lib/atlasImages';
import { freshwaterCatalog } from '@/lib/catalog';

export function SiteHeader() {
  return <>
    <link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
    <a className="atlas-skip" href="#main-content">Skip to content</a>
    <header className="atlas-header">
      <Link href="/" className="atlas-brand">Native Waters</Link>
      <nav className="atlas-nav" aria-label="Main navigation">
        <Link href="/#rivers">Rivers</Link>
        <Link href="/field-guide">Field guide</Link>
        <Link href="/conservation">Conservation</Link>
        <Link href="/experience" prefetch={false}>Explore in 3D</Link>
      </nav>
    </header>
  </>;
}

export function SiteFooter() {
  return <footer className="atlas-footer">
    <div><Link className="atlas-brand" href="/">Native Waters</Link>
      <nav aria-label="Footer navigation"><Link href="/field-guide">Field guide</Link><Link href="/conservation">Conservation</Link><Link href="/method">Our method</Link><Link href="/privacy">Privacy</Link></nav>
    </div>
    <p>A growing reference to India’s freshwater life. The 3D habitats are illustrative, not verified reconstructions. River records remain readable without JavaScript or WebGL.</p>
    <nav aria-label="3D river entry points"><Link href="/experience" prefetch={false}>Cauvery in 3D</Link><Link href="/experience/ganga" prefetch={false}>Ganga in 3D</Link><Link href="/experience/godavari" prefetch={false}>Godavari in 3D</Link><Link href="/experience/brahmaputra" prefetch={false}>Brahmaputra in 3D</Link><Link href="/basins/krishna#river-experience">Krishna in 3D</Link></nav>
    <details><summary>Image and type credits</summary>
      <p>Every species image below is a photograph or a nineteenth-century plate from Wikimedia Commons, reproduced under the licence stated in its caption.</p>
      <ul>
        {atlasImages().map(image => <li key={image.id}>
          {freshwaterCatalog.species.find(species => species.id === image.id)?.commonName ?? image.id} — {imageKindLabel(image).toLowerCase()}{image.creator ? ` by ${image.creator}` : ''}, {image.dateLabel}. <a href={image.licenseUrl}>{image.license}</a>. <a href={image.page}>Source file</a>.
        </li>)}
        <li><a href="https://commons.wikimedia.org/wiki/File:Rapids_Kaveri_Doddegaudana_Koppalu_Mandya_Aug24_A7CR_02167.jpg">Kaveri rapids, Mandya</a>, Timothy A. Gonsalves, 2024. <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Display crop; no colour alteration.</li>
        <li>Underwater artwork: existing Native Waters illustration. Typography: <a href="https://github.com/Omnibus-Type/Archivo">Archivo by Omnibus-Type</a>, <a href="/fonts/OFL.txt">SIL Open Font License 1.1</a>.</li>
        <li><a href="/atlas/credits.json">Machine-readable credit and licence record</a>.</li>
      </ul>
    </details>
  </footer>;
}
