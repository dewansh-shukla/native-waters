import Link from 'next/link';

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
    <details><summary>Image and type credits</summary><ul>
      <li>Rohu archival plate, <a href="https://commons.wikimedia.org/wiki/File:Labeo_rohita_-_1807-1822_-_Print_-_Iconographia_Zoologica_-_Special_Collections_University_of_Amsterdam_-_UBA01_IZ15000080.tif">Iconographia Zoologica, University of Amsterdam</a>, 1807–1822. <a href="https://creativecommons.org/publicdomain/mark/1.0/">Public domain</a>.</li>
      <li><a href="https://commons.wikimedia.org/wiki/File:Labeo_calbasu_Day_Mintern_126.jpg">Labeo calbasu</a>, Francis Day and R. Mintern; <a href="https://commons.wikimedia.org/wiki/File:Barbus_arulius_Mintern_142.jpg">Barbus arulius</a>, R. Mintern, 1878. <a href="https://creativecommons.org/publicdomain/mark/1.0/">Public domain</a>. Historical plate names are retained; identity requires taxonomic review.</li>
      <li><a href="https://commons.wikimedia.org/wiki/File:Rapids_Kaveri_Doddegaudana_Koppalu_Mandya_Aug24_A7CR_02167.jpg">Kaveri rapids, Mandya</a>, Timothy A. Gonsalves, 2024. <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Display crop; no colour alteration.</li>
      <li>Underwater artwork: existing Native Waters illustration. Typography: <a href="https://github.com/Omnibus-Type/Archivo">Archivo by Omnibus-Type</a>, <a href="/fonts/OFL.txt">SIL Open Font License 1.1</a>.</li>
    </ul></details>
  </footer>;
}
