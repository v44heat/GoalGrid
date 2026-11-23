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
  poweredByHeader: false,
  async headers() {
    // A strict Content-Security-Policy is deliberately not set: Next.js injects inline scripts and a
    // wrong policy would break the app. These headers are safe and cover the common attacks.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" }, // no clickjacking via iframes
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
