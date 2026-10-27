import type { NextConfig } from "next";

/** Empty in local dev. GitHub Pages sets this to /medideutsch. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Project Pages serves each route as a directory index. Local dev keeps the current URLs.
  trailingSlash: Boolean(basePath),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
