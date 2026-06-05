const envalid = require('envalid');
const { i18n } = require('./next-i18next.config');

const authDependent = envalid.makeValidator((x) => {
  const authEnabled = process.env.HEALTH_AUTH === 'true';

  if (authEnabled && !x.length) {
    throw new Error(`Can't be empty if "HEALTH_AUTH" is true`);
  }

  return x;
});

envalid.cleanEnv(process.env, {
  NEXT_PUBLIC_API_URL: envalid.str(),
  HEALTH_AUTH: envalid.bool(),
  HEALTH_USERNAME: authDependent(),
  HEALTH_PASSWORD: authDependent(),
});

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  turbopack: {},
  output: 'standalone',
  i18n,
  images: {
    domains: [process.env.DOMAIN_NAME],
    formats: ['image/avif', 'image/webp'],
  },
  basePath: process.env.BASE_PATH,
  sassOptions: {
    prependData: `$basePath: '${process.env.BASE_PATH}';`,
  },
  transpilePackages: ['lucide-react'],
  experimental: {
    optimizePackageImports: ['@sk-web-gui'],
  },
  async rewrites() {
    return [{ source: '/napi/:path*', destination: '/api/:path*' }];
  },
});
