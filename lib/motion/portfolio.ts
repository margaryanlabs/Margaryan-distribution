import type { MotionBrand } from "./studio";

/**
 * Editorial metadata only — never treat these repo paths as license to read private
 * GitHub contents in a public browser. "verified" means asset bytes were copied from
 * a controlled source and checked for branded markup; it does not attest to currentness.
 * Private repository IDs are deliberately NOT embedded in this public site.
 */
export interface PortfolioSource {
  repository: string | null;
  assetPath: string | null;
  localLogo: string | null;
  logoStatus: "source-verified" | "pending-source";
  product: string;
  site?: string;
  directorMotif: string;
}
export const PORTFOLIO: Record<MotionBrand, PortfolioSource> = {
  promptence: {
    repository: null,
    assetPath: "public/promptence-signal-mark.svg",
    localLogo: "/motion/brands/promptence.svg",
    logoStatus: "source-verified",
    product: "AI search visibility and evidence-based remediation",
    site: "promptence.tech",
    directorMotif: "semantic search, answer citations, source cards, discovery trails"
  },
  veto: {
    repository: null,
    assetPath: null,
    localLogo: null,
    logoStatus: "pending-source",
    product: "decision intelligence for crypto markets",
    directorMotif: "risk, context, market regimes, probability under uncertainty"
  },
  raios: {
    repository: null,
    assetPath: "public/raios-mark.png",
    localLogo: null,
    logoStatus: "pending-source",
    product: "restaurant operating intelligence",
    site: "raios.pro",
    directorMotif: "restaurant operations, margin leaks, read-only data, measured outcomes"
  },
  labs: {
    repository: "margaryanlabs/Margaryan-distribution",
    assetPath: null,
    localLogo: null,
    logoStatus: "pending-source",
    product: "independent AI products and systems",
    directorMotif: "creative technology, independent research, systems engineering"
  },
  ingu: {
    repository: null,
    assetPath: "public/brand/ingu-script-logo.svg",
    localLogo: "/motion/brands/ingu.svg",
    logoStatus: "source-verified",
    product: "editorial fashion marketplace",
    site: "ingu.shop",
    directorMotif: "fashion editorial, textiles, museum archive, negative space"
  },
  meqena: {
    repository: null,
    assetPath: null,
    localLogo: null,
    logoStatus: "pending-source",
    product: "automotive marketplace and dealer discovery",
    directorMotif: "road, travel, object detail, automotive motion"
  },
  suren: {
    repository: null,
    assetPath: null,
    localLogo: null,
    logoStatus: "pending-source",
    product: "private Dubai real estate intelligence",
    directorMotif: "architecture, skyline, private capital, editorial restraint"
  },
  veto_private: {
    repository: "margaryanlabs/Telegram-story-bot",
    assetPath: "public/veto-telegram-mark.svg",
    localLogo: "/motion/brands/veto-private.svg",
    logoStatus: "source-verified",
    product: "Telegram personal-control tools",
    directorMotif: "privacy interfaces, connection state, restrained security motifs"
  },
  veto_sport: {
    repository: "margaryanlabs/Vetosport",
    assetPath: "public/veto-mark.svg",
    localLogo: "/motion/brands/veto-sport.svg",
    logoStatus: "source-verified",
    product: "sports price and decision analysis",
    directorMotif: "odds as prices, audited probabilities, event context"
  },
  armat: {
    repository: null,
    assetPath: null,
    localLogo: null,
    logoStatus: "pending-source",
    product: "marketplace for Armenian producers",
    directorMotif: "origin, craftsmanship, cultural detail, global distribution"
  }
};
export const PORTFOLIO_BRANDS = Object.keys(PORTFOLIO) as MotionBrand[];
export const VERIFIED_LOGOS = Object.fromEntries(
  Object.entries(PORTFOLIO).filter(([,p]) => p.logoStatus === "source-verified").map(([k,p]) => [k,p.localLogo])
) as Partial<Record<MotionBrand,string>>;
