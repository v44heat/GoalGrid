export const APP_NAME = "eFootball League";

export const SEASON_LENGTH_DAYS = 30;

export const POINTS = { win: 3, draw: 1, loss: 0 } as const;

export const MAIN_NAV = [
  { href: "/", label: "Home" },
  { href: "/standings", label: "Standings" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/results", label: "Results" },
  { href: "/players", label: "Players" },
  { href: "/statistics", label: "Statistics" },
  { href: "/seasons", label: "Seasons" },
] as const;
