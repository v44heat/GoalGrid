/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Team logos are served from Supabase Storage (bucket: team-logos).
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  experimental: {
    // Default is 1 MB, which is exactly the logo limit; leave headroom for form overhead.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
