export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "SUPERSEDED";

export interface Proposal {
  id: string;
  fixtureId: string;
  submittedBy: string;
  submittedByName: string;
  homeScore: number;
  awayScore: number;
  status: ProposalStatus;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** A pending proposal with everything the admin needs to decide on it. */
export interface ApprovalItem extends Proposal {
  seasonName: string;
  matchday: number;
  scheduledDate: string;
  homeName: string;
  awayName: string;
}
