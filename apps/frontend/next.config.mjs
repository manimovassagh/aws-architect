/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@awsarchitect/shared'],
};

export default nextConfig;
