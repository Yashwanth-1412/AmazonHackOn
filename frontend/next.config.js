/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["cachyos", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "images.openfoodfacts.org" },
    ],
  },
};

module.exports = nextConfig;
