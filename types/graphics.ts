// Plain serialisable data handed from server pages to the client-side image renderers.

export interface TeamArt {
  name: string;
  shortName: string;
  logoUrl: string | null;
}

export interface Side {
  player: string;
  team: TeamArt | null;
}

export interface MatchCardData {
  seasonName: string;
  matchday: number;
  home: Side;
  away: Side;
  homeScore: number;
  awayScore: number;
  dateIso: string;
}

export interface TableImageRow {
  position: number;
  tied: boolean;
  player: string;
  team: TeamArt | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
}

export interface TableImageData {
  seasonName: string;
  generatedOnIso: string;
  anyPlayed: boolean;
  rows: TableImageRow[];
}

export interface FixturesImageData {
  seasonName: string;
  matchday: number;
  fixtures: {
    home: Side;
    away: Side;
    dateIso: string;
    /** "3 - 1" once played, otherwise null */
    score: string | null;
    /** shown under "VS" when not simply upcoming/played */
    note: string | null;
  }[];
}

export interface SummaryCardData {
  seasonName: string;
  champion: {
    player: string;
    team: TeamArt | null;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    points: number;
  };
  runnersUp: { position: number; player: string; team: TeamArt | null; points: number }[];
}
