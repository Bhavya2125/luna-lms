import type { NextConfig } from "next";

// Identifies this deploy, so open tabs and installed apps can tell when a newer version is live.
const buildId = process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  serverExternalPackages: ["@electric-sql/pglite", "pg", "web-push", "bcryptjs"],
  async headers() {
    return [
      {
        // the service worker must never be served stale
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
