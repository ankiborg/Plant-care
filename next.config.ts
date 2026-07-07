import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  experimental: {
    serverActions: {
      // Photo uploads (identify + gallery) send the image through a server
      // action; the Next.js default of 1 MB rejects any real phone photo.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
