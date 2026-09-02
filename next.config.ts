import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "https://services.infield.co.in";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    proxyClientMaxBodySize: "100mb",
    // Default dev proxy timeout is 30s — bulk Excel uploads (product/store master) need longer.
    proxyTimeout: 300_000, // 5 minutes
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
