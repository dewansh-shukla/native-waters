/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:path*/opengraph-image',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      {
        source: '/opengraph-image',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ];
  },
  async redirects() {
    return [
      // The duplicated host below is the Vercel deployment alias; the destination
      // mirrors SITE_ORIGIN in src/lib/reference.ts.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'native-waters.vercel.app' }],
        destination: 'https://www.discovernativewaters.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
