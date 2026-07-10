/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vehicle photos uploaded by admins live on Cloudinary; next/image only

    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dajqnppcb/**",
      },
    ],
  },
};

export default nextConfig;
