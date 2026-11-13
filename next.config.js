const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  staticPageGenerationTimeout: 300,
  // Subpath hosting (e.g. GitHub Pages at brightmann.github.io/jb):
  // build with NEXT_BASE_PATH=/jb. Leave unset for root hosting
  // (Cloudflare Workers at jb.luckypoem.workers.dev).
  basePath: process.env.NEXT_BASE_PATH || '',
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_BASE_PATH || '',
  },
  images: {
    unoptimized: true,
    domains: [
      'www.notion.so',
      'notion.so',
      'images.unsplash.com',
      'pbs.twimg.com',
      'abs.twimg.com',
      's3.us-west-2.amazonaws.com',
    ],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // i18n: {
  //   // These are all the locales you want to support in
  //   // your application
  //   locales: ['en-US', 'zh-CN'],
  //   // This is the default locale you want to be used when visiting
  //   // a non-locale prefixed path e.g. `/hello`
  //   defaultLocale: 'en-US',
  // },
})
