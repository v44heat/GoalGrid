import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PitchMarkings } from "@/components/layout/PitchMarkings";
import { SEASON_LENGTH_DAYS } from "@/lib/constants";

const FORMAT = [
  { label: "Players", value: "6" },
  { label: "Matchdays", value: "10" },
  { label: "Matches", value: "30" },
  { label: "Days", value: String(SEASON_LENGTH_DAYS) },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-turf-700 bg-gradient-to-br from-turf-800 to-turf-900 px-6 py-14 sm:px-12 sm:py-20">
        <PitchMarkings className="pointer-events-none absolute -right-16 top-1/2 hidden w-[520px] -translate-y-1/2 text-grass/15 md:block" />

        <div className="relative max-w-xl">
          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
            Everyone plays everyone, home and away.
          </h1>
          <p className="mt-5 max-w-md text-lg text-chalk-dim">
            One month, one table. Fixtures, results and standings for our
            eFootball league, always calculated from the scores.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/standings">
              <Button size="lg">View standings</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Join the league
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Season format" className="mt-8">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FORMAT.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-turf-700 bg-turf-800/60 px-5 py-4"
            >
              <dt className="text-sm text-chalk-dim">{f.label}</dt>
              <dd className="tabular font-display text-5xl font-bold text-grass">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-chalk-faint">
          Standard format for six players. Fixtures are generated from whoever
          joins the season.
        </p>
      </section>
    </>
  );
}
