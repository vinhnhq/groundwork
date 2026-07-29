import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Strict-ish CSP as a static header (keeps pages static/ISR-eligible).
 *
 * 'unsafe-inline' is allowed for script+style — Next.js + Tailwind need it, and
 * dropping it forces nonces → every page dynamic (tech-standards §14). Prefer
 * experimental.sri over nonces if hardening later.
 *
 * `'unsafe-eval'` is added **in development only**. React's dev build uses
 * eval() for debugging features (reconstructing callstacks across environments)
 * and Next's HMR client needs it too; without it the console throws on every
 * page load. React never uses eval() in a production build, so the production
 * policy stays as strict as it was — which is the half that actually ships.
 *
 * Same for the websocket: HMR dials `ws://localhost`, which `connect-src 'self'`
 * does not cover.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
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
