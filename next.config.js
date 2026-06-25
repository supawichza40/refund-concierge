/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SSE route handlers must run on the Node.js runtime (not Edge) and never be
  // statically cached. Individual route files also export `runtime`/`dynamic`,
  // this is the project-wide safety net.
  experimental: {},
};

module.exports = nextConfig;
