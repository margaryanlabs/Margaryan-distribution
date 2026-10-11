import path from "node:path";
import type { NextConfig } from "next";
// This is a separate, public-only application. The build imports motion
// modules from the shared repo, but private CRM routes are never mounted.
const nextConfig:NextConfig={
  poweredByHeader:false,
  reactStrictMode:true,
  outputFileTracingRoot:path.resolve(__dirname,"../.."),
  // Motion's shared source sits outside this isolated app root; resolve its
  // third-party packages from the standalone app's installed node_modules.
  turbopack:{
    root:path.resolve(__dirname,"../.."),
    resolveAlias:{
      three:path.resolve(__dirname,"node_modules/three"),
      gsap:path.resolve(__dirname,"node_modules/gsap")
    }
  },
  async headers(){return [{source:"/(.*)",headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"Referrer-Policy",value:"no-referrer"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
  ]}];}
};
export default nextConfig;
