import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Only gcrankings.com visitors land directly on the rankings page
      {
        source: '/',
        destination: '/rankings',
        permanent: true,
        has: [{ type: 'host', value: 'gcrankings.com' }],
      },
    ]
  },
};

export default nextConfig;
