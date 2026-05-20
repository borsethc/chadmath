import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_PUBLIC_EXPORT ? "export" : undefined,
  /* config options here */
  experimental: {
    // serverActions: {
    //   allowedOrigins: ["localhost:3000", "10.241.85.58:3000"],
    // },
  },
};

export default nextConfig;
