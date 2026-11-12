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
    return [{ source: "/:path*", headers: securityHeaders }];
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
