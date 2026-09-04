import type { ReactNode } from "react";
import "./styles.css";

export const metadata = { title: "Margaryan Distribution", description: "Autonomous sales, SMM and distribution operating system" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
