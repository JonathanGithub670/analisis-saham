import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow API calls to the backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
