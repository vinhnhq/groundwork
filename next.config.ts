import type { NextConfig } from "next";

// Strict-ish CSP as a static header (keeps pages static/ISR-eligible).
// 'unsafe-inline' is allowed for script+style — Next.js + Tailwind need it, and
// dropping it forces nonces → every page dynamic (tech-standards §14). Prefer
// experimental.sri over nonces if hardening later.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Neon WebSocket driver ships a native `ws` dependency — must stay external.
  serverExternalPackages: ["ws"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
