/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    dirs: ["app", "src"]
  },
  poweredByHeader: false
};

export default nextConfig;
