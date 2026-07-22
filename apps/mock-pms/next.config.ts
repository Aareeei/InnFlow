import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  transpilePackages: ['@innflow/database', '@innflow/domain', '@innflow/config'],
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  outputFileTracingIncludes: {
    '/api/**': [
      './node_modules/.pnpm/**/node_modules/.prisma/client/**',
      './node_modules/.pnpm/**/node_modules/@prisma/client/**',
    ],
  },
  serverExternalPackages: ['argon2', '@prisma/client'],
};

export default nextConfig;
