export type Evidence = {
  label: string;
  url: string;
  type: "manufacturer" | "report" | "marketplace";
  note?: string;
};
export type Chase = {
  id: string;
  player: string;
  card: string;
  parallel: string;
  printRun: number;
  status: "documented" | "unverified";
  copiesSeen: number;
  serials: string[];
  evidence: Evidence[];
  checklistSources?: { url: string; label: string; sha256: string }[];
};
export type Release = {
  slug: string;
  title: string;
  brand: string;
  sport: string;
  year: string;
  format: string;
  cardCount: number;
  packs: number;
  autoCount: number;
  msrp: number;
  checklistUrl: string;
  productUrl: string;
  summary: string;
  featured: boolean;
  coverage: "tracked" | "coming soon";
};
export const releases: Release[] = [
  {
    slug: "2025-26-topps-chrome-black-basketball",
    title: "2025–26 Topps Chrome Black Basketball",
    brand: "Topps",
    sport: "Basketball",
    year: "2025–26",
    format: "Hobby Box",
    cardCount: 13,
    packs: 2,
    autoCount: 1,
    msrp: 359.99,
    checklistUrl:
      "https://cdn.shopify.com/s/files/1/0662/9749/5709/files/Cheklist_chrome_black.pdf?v=1785244468",
    productUrl:
      "https://launches.topps.com/en-US/launch/2025-26-topps-chrome-black-basketball-hobby-box",
    summary:
      "Two six-card packs and one encased autograph. A premium chrome release with rare parallels and signature chases.",
    featured: true,
    coverage: "tracked",
  },
];
// Only include a "documented" status with attributable evidence attached. A manufacturer checklist proves existence, not a pull.
export const chases: Chase[] = [
  {
    id: "cf-ra-1",
    player: "Cooper Flagg",
    card: "Rookie Autographs · RA-CF",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "cf-base-1",
    player: "Cooper Flagg",
    card: "Base · #101",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "cf-sf-1",
    player: "Cooper Flagg",
    card: "Super Futures Autographs · SF-CF",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "cf-gu-1",
    player: "Cooper Flagg",
    card: "Glow Up Signatures · GU-CF",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "dh-ra-1",
    player: "Dylan Harper",
    card: "Rookie Autographs · RA-DH",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "dh-sf-1",
    player: "Dylan Harper",
    card: "Super Futures Autographs · SF-DH",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "kk-ra-1",
    player: "Kon Knueppel",
    card: "Rookie Autographs · RA-KK",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "kk-sf-1",
    player: "Kon Knueppel",
    card: "Super Futures Autographs · SF-KK",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "vw-au-1",
    player: "Victor Wembanyama",
    card: "Autographs · AU-VW",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "sc-base-1",
    player: "Stephen Curry",
    card: "Base · #16",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "ve-base-1",
    player: "VJ Edgecombe",
    card: "Base · #45",
    parallel: "Superfractor",
    printRun: 1,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "cf-ra-5",
    player: "Cooper Flagg",
    card: "Rookie Autographs · RA-CF",
    parallel: "Red",
    printRun: 5,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "cf-ra-25",
    player: "Cooper Flagg",
    card: "Rookie Autographs · RA-CF",
    parallel: "Orange",
    printRun: 25,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "dh-ra-5",
    player: "Dylan Harper",
    card: "Rookie Autographs · RA-DH",
    parallel: "Red",
    printRun: 5,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
  {
    id: "kk-ra-5",
    player: "Kon Knueppel",
    card: "Rookie Autographs · RA-KK",
    parallel: "Red",
    printRun: 5,
    status: "unverified",
    copiesSeen: 0,
    serials: [],
    evidence: [],
  },
];
export const usd = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
