import type { ReactNode } from "react";
import {WorkspaceDock} from "@/components/workspace-dock";
import "./styles.css";

export const metadata = { title: "Margaryan Distribution", description: "Revenue, marketing and decision intelligence operating system for Margaryan Labs" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}<WorkspaceDock/></body></html>;
}
