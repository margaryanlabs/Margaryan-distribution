import type {ReactNode} from "react";
import type {Metadata} from "next";

export const metadata:Metadata={
 title:"Motion Studio — Product Films & Creative Production | Margaryan Labs",
 description:"Commission an original product film, launch video or feature story. Real product sources, honest visual storytelling, reviewed original footage, edited master and human sign-off.",
 robots:{index:true,follow:true},
 alternates:{canonical:"/motion/commission"},
 openGraph:{title:"Motion Studio / Made for the story",description:"Commercial films directed around the actual product — from creative brief to reviewed master.",type:"website"}
};
export default function MotionCommissionLayout({children}:{children:ReactNode}){return <>{children}</>;}
