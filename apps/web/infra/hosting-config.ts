/**
 * The `firebase.json` the deploy step hands to the Firebase CLI. Kept as a pure
 * function so the hosting rules (SPA fallback, caching, security headers, API
 * rewrite) live in one reviewable place.
 */

export interface ApiRewrite {
  /** Cloud Run service that serves the backend; `/api/**` is forwarded to it. */
  serviceId: string;
  region: string;
}

export interface HostingConfigInput {
  siteId: string;
  /** The built app, relative to the folder firebase.json is written to (and inside it). */
  publicDir: string;
  api?: ApiRewrite | undefined;
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

export const buildHostingConfig = ({ siteId, publicDir, api }: HostingConfigInput) => ({
  hosting: {
    site: siteId,
    public: publicDir,
    cleanUrls: true,
    trailingSlash: false,
    ignore: ["**/.*"],
    rewrites: [
      ...(api ? [{ source: "/api/**", run: { serviceId: api.serviceId, region: api.region } }] : []),
      // Single-page app: every other path is handled by React Router.
      { source: "**", destination: "/index.html" },
    ],
    headers: [
      { source: "**", headers: securityHeaders },
      // Vite fingerprints everything in /assets, so it can be cached forever.
      { source: "/assets/**", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // index.html points at the current fingerprinted assets; always revalidate it.
      { source: "/index.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ],
  },
});
