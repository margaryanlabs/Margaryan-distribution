import type { ReactNode } from "react";
/**
 * Route-scoped editorial typography. When Google Fonts is unreachable,
 * Canvas uses locally available DejaVu/Noto/Arial fallbacks and quality review
 * flags Armenian glyphs for manual inspection.
 */
export default function MotionLayout({children}:{children:ReactNode}){
  return <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+Armenian:wght@400;500;600;700;800;900&family=Noto+Sans:wght@400;500;600;700;800;900&display=swap" />
    {children}
  </>;
}
