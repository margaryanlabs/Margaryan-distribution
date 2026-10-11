import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./global.css";
export const metadata:Metadata={title:"Margaryan Content Studio — ChatGPT Motion Engine",description:"Create and edit procedural motion videos inside ChatGPT, without a separate OpenAI API key."};
export default function RootLayout({children}:{children:ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
