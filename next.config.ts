import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "https://services.infield.co.in";


const staging = process.env.APP_ENV === "staging";
if (staging) {
  for (const name of ["BACKEND_URL", "NEXT_PUBLIC_API_URL"]) {
    const value = process.env[name];
    if (!value || new URL(value).origin !== "https://staging-services.infield.co.in") {
      throw new Error(`Staging requires ${name}=https://staging-services.infield.co.in`);
    }
  }
}

const nextConfig: NextConfig = {
  ...(staging ? { output: "standalone" as const, typescript: { tsconfigPath: "tsconfig.staging.json" } } : {}),
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
