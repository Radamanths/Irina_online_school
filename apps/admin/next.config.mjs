/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@virgo/config", "@virgo/ui"],
  eslint: {
    dirs: ["app", "src"]
  },
  poweredByHeader: false
};

export default nextConfig;
