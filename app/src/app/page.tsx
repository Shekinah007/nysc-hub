import Link from 'next/link'

/**
 * Landing page — the platform's front door.
 *
 * Three audience entries (prospective applicants, serving corp members, ex-
 * corp members) matching the platform's full-lifecycle scope, plus the camp
 * directory as the primary indexed content surface.
 */
export default function Home() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Everything NYSC, one place.
        </h1>
        <p className="max-w-2xl text-base text-muted">
          Camp requirements and locations, answers from corp members who have
          been there, and per-camp updates once you are serving. Built by a
          corper, for corpers.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/camps"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white"
          >
            Browse the 37 camps
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <AudienceCard
          href="/camps"
          title="Prospective"
          body="Camp requirements, fees, travel, and relocation — know before you go."
        />
        <AudienceCard
          href="/camps"
          title="Serving"
          body="Your camp workspace: announcements, schedules, departments, and discussions."
        />
        <AudienceCard
          href="/camps"
          title="Ex-corper"
          body="Answers for the next batch — pass on what you learned."
        />
      </section>
    </div>
  )
}

function AudienceCard({
  href,
  title,
  body,
}: {
  href: string
  title: string
  body: string
}) {
  return (
    <Link href={href} className="block">
      <div className="h-full rounded-lg border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(16,29,23,0.05)] transition-shadow hover:shadow-md">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
    </Link>
  )
}
