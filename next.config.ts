import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "https://services.infield.co.in";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
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
