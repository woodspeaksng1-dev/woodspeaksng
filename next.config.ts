import type { NextConfig } from "next";

// Baseline security headers. The CSP covers what can't break the site: no plugins, no <base> hijack, no
// framing. A script allow-list (Paystack, Firebase, Google sign-in) is a later, tested step.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// Google sign-in runs through our own domain, so Google's account chooser says "continue to woodspeaks.ng",
// not the Firebase project's address: /__/auth/* is passed through to Firebase's handler (see Firebase's
// "best practices for signInWithRedirect", option 3). Firebase frames that handler on our own pages, so
// those paths may be framed by this site only (in case our headers reach the proxied page). Takes effect
// when NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set to the site's domain, and that domain's /__/auth/handler is
// an authorised redirect URI on the OAuth client in Google Cloud.
const firebaseHost = `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`;
const authHandlerHeaders = [
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Tailwind CSS v4 runs as a Turbopack loader (there is no PostCSS config).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Lets a phone on the same Wi-Fi load dev scripts (http://<mac's LAN IP>:3000). Dev server only.
  allowedDevOrigins: ["192.168.*.*", "172.*.*.*", "10.*.*.*"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/__/auth/:path*", headers: authHandlerHeaders }, // later entries win for the same header
    ];
  },
  async rewrites() {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return [];
    return [{ source: "/__/auth/:path*", destination: `https://${firebaseHost}/__/auth/:path*` }];
  },
  // The old site (until Nov 2026) had only /, /checkout and /success; Google indexed none of its pages.
  // /checkout is the same address here. Its logo images (/logos/*) are deliberately left to 404.
  async redirects() {
    return [
      { source: "/success", destination: "/shop", permanent: true },
      { source: "/favicon.jpg", destination: "/icon.png", permanent: true },
    ];
  },
};

export default nextConfig;
