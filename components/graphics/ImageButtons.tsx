"use client";

// Thin wrappers: each one loads its renderer on demand, so the canvas code is only
// downloaded when someone actually asks for an image.
import { DownloadImageButton } from "@/components/graphics/DownloadImageButton";
import type {
  FixturesImageData,
  MatchCardData,
  SummaryCardData,
  TableImageData,
} from "@/types/graphics";

export function MatchCardButton({ data, iconOnly }: { data: MatchCardData; iconOnly?: boolean }) {
  return (
    <DownloadImageButton
      label="Download Match Card"
      iconOnly={iconOnly}
      filename={`match-card-md${data.matchday}-${data.home.player}-vs-${data.away.player}`}
      makeBlob={async () => (await import("@/lib/graphics/matchCard")).matchCardBlob(data)}
    />
  );
}

export function TableImageButton({ data }: { data: TableImageData }) {
  return (
    <DownloadImageButton
      label="Download Table"
      filename={`league-table-${data.seasonName}-${data.generatedOnIso}`}
      makeBlob={async () => (await import("@/lib/graphics/tableImage")).tableImageBlob(data)}
    />
  );
}

export function FixturesImageButton({ data, iconOnly }: { data: FixturesImageData; iconOnly?: boolean }) {
  return (
    <DownloadImageButton
      label="Download Fixtures"
      iconOnly={iconOnly}
      variant="ghost"
      filename={`fixtures-${data.seasonName}-matchday-${data.matchday}`}
      makeBlob={async () => (await import("@/lib/graphics/fixturesImage")).fixturesImageBlob(data)}
    />
  );
}

export function SummaryCardButton({ data }: { data: SummaryCardData }) {
  return (
    <DownloadImageButton
      label="Download Season Summary"
      variant="primary"
      filename={`season-summary-${data.seasonName}`}
      makeBlob={async () => (await import("@/lib/graphics/summaryCard")).summaryCardBlob(data)}
    />
  );
}
