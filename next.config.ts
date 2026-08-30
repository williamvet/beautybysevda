import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chromebook Linux: Chrome öppnar via Network-IP, inte localhost
  allowedDevOrigins: [
    "100.115.92.194",
    "localhost",
    "127.0.0.1",
    "examine-mortgage-refurbished-evaluation.trycloudflare.com",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
