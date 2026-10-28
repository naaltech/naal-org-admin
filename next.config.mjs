/**
 * Not: build/dev betikleri `--webpack` ile çalışır. Turbopack'in Sass importer'ı Carbon paketlerindeki
 * göreli `@use 'scss/...'` yollarını çözemiyor (@carbon/type, @carbon/feature-flags).
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  sassOptions: {
    // Carbon'un kendi Sass kaynaklarındaki kullanımdan kaldırma uyarılarını bastır.
    quietDeps: true,
    silenceDeprecations: ['if-function', 'import', 'global-builtin'],
  },
  async redirects() {
    return [
      // Düzenleme artık sertifika listesinin içinde.
      { source: '/certificates/manage', destination: '/certificates', permanent: true },
    ]
  },
}

export default nextConfig
