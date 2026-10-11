import path from "node:path";
import type { NextConfig } from "next";
// This is a separate, public-only application. The build imports motion
// modules from the shared repo, but private CRM routes are never mounted.
const nextConfig:NextConfig={
  poweredByHeader:false,
  reactStrictMode:true,
  outputFileTracingRoot:path.resolve(__dirname,"../.."),
  async headers(){return [{source:"/(.*)",headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"Referrer-Policy",value:"no-referrer"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
  ]}];}
};
export default nextConfig;
