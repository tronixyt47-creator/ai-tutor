/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid spawning worker child processes during static generation
  // (blocked in some sandboxed Windows environments).
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

module.exports = nextConfig;
