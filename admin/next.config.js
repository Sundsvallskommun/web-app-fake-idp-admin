const envalid = require('envalid');
const { i18n } = require('./next-i18next.config');

envalid.cleanEnv(process.env, {
  NEXT_PUBLIC_API_URL: envalid.str(),
});

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  allowedDevOrigins: ['idp.test'],
  turbopack: {},
  output: 'standalone',
  i18n,
  images: {
    remotePatterns: process.env.DOMAIN_NAME ? [{ hostname: process.env.DOMAIN_NAME }] : [],
    formats: ['image/avif', 'image/webp'],
  },
  basePath: process.env.BASE_PATH,
  sassOptions: {
    prependData: `$basePath: '${process.env.BASE_PATH}';`,
  },
  transpilePackages: ['lucide-react'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [{ source: '/napi/:path*', destination: '/api/:path*' }];
  },
});
