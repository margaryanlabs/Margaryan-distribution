import path from "node:path";
import type { NextConfig } from "next";
// Dedicated public app: only motion routes are mounted, not Distribution CRM.
const nextConfig:NextConfig={
  poweredByHeader:false,
  reactStrictMode:true,
  outputFileTracingRoot:path.resolve(__dirname,"../.."),
  // Our Motion source lives in /lib/motion. Resolve its runtime dependencies
  // from the standalone app installation instead of the repository root.
  webpack(config){
    config.resolve ??={};
    const previous=config.resolve.modules||["node_modules"];
    config.resolve.modules=[path.resolve(__dirname,"node_modules"),...previous];
    return config;
  },
  async headers(){return [{source:"/(.*)",headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"Referrer-Policy",value:"no-referrer"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
  ]}];}
};
export default nextConfig;
