"use client";
import {useState} from "react";
import styles from "./mcp.module.css";
export default function CopyMcpEndpoint(){
 const [copied,setCopied]=useState(false);
 async function copy(){
  try{
   await navigator.clipboard.writeText(new URL("/api/motion/mcp",window.location.origin).toString());
   setCopied(true);
   window.setTimeout(()=>setCopied(false),2400);
  }catch{setCopied(false);}
 }
 return <button type="button" className={styles.copy} onClick={copy}
  aria-label="Copy first-party MCP server URL">
  {copied?"✓ COPIED":"COPY MCP URL ↗"}
 </button>;
}
