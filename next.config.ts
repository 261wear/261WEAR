import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres used for local development only.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
