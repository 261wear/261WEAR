import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres used for local development only.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Fonts of the framed social photos, read from disk at request time.
  outputFileTracingIncludes: { "/api/studio": ["./src/assets/fonts/*.ttf"] },
  experimental: {
    // Tailwind's stylesheet (~12 KB compressed) goes inside the page instead of
    // a separate file: one network round trip less before the first paint,
    // which matters on Malagasy mobile networks and for first-time visitors
    // coming from social posts.
    inlineCss: true,
  },
};

export default nextConfig;
