import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Native Waters',
    short_name: 'Native Waters',
    description:
      'Explore sourced native freshwater fish records for five Indian river systems — Ganga, Brahmaputra, Cauvery, Krishna and Godavari — with an interactive underwater experience and an evidence-based field guide.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#101c1e',
    theme_color: '#101c1e',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
