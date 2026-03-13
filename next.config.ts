import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // gcrankings.com visitors land directly on the rankings page
      { source: '/', destination: '/rankings', permanent: true },
    ]
  },
};

export default nextConfig;
