import type { NextConfig } from "next";

const { version } = require("./package.json");

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx"],
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion/react"],
  },
};

export default nextConfig;
