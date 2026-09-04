import "./styles.css";
export const metadata = { title: "Margaryan Distribution", description: "Autonomous sales, SMM and distribution operating system" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
