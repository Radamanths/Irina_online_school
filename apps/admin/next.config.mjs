/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  transpilePackages: ["@virgo/config", "@virgo/ui"],
  eslint: {
    dirs: ["app", "src"],
    ignoreDuringBuilds: true
  },
  poweredByHeader: false
};

export default nextConfig;
