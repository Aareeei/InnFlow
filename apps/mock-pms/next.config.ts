import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  transpilePackages: ['@innflow/database', '@innflow/domain', '@innflow/config'],
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  serverExternalPackages: ['argon2'],
};

export default nextConfig;
