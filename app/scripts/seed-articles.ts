/**
 * scripts/seed-articles.ts — seed the launch info-hub articles (Task 15).
 *
 * Five first drafts, every factual claim cited (SPEC-info-hub.md boundary:
 * "Never publish without a verifiable public source"). Seeded as DRAFTS so
 * the platform owner reviews each one before flipping to published — the
 * publish gate requires at least one source per article, which these all
 * carry.
 *
 * Idempotent: upsert by slug, never overwrites status/publishedAt. Run with
 * the same env as seed-camps:
 *   node --env-file=.env.local --import tsx scripts/seed-articles.ts
 */
import mongoose from 'mongoose'

import { dbConnect } from '../src/lib/db'
import { InfoArticle, type ArticleSource } from '../src/models/info-hub/InfoArticle'

type SeedArticle = {
  slug: string
  title: string
  category: 'documents' | 'fees' | 'travel' | 'relocation' | 'general'
  tags: string[]
  sources: ArticleSource[]
  body: string
}

const SOURCES = {
  faq: {
    title: 'NYSC — FAQs (official)',
    url: 'https://www.nysc.gov.ng/faq.html',
  },
  mob: {
    title: 'NYSC — Corps Mobilisation (official)',
    url: 'https://www.nysc.gov.ng/corpmob.html',
  },
  portal: {
    title: 'NYSC Portal (official)',
    url: 'https://portal.nysc.org.ng/nysc/',
  },
  guide: {
    title: 'MyNYSC Guide — Orientation Camp',
    url: 'https://nyscguide.org/mobilization/orientation-camp',
  },
  batchb: {
    title: 'NYSC Batch B 2026 registration guide (campustimesng)',
    url: 'https://campustimesng.com/2026-nysc-batch-b-online-registration-guide-requirements',
  },
}

const articles: SeedArticle[] = [
  {
    slug: 'documents-required-for-camp',
    title: 'Documents required for NYSC orientation camp',
    category: 'documents',
    tags: ['camp', 'registration', 'documents', 'call-up letter'],
    sources: [SOURCES.faq, SOURCES.mob, SOURCES.guide],
    body: `# Documents required for NYSC orientation camp

You will need the following at registration in camp. Bring **originals plus
photocopies** — camp officials verify the originals and keep the copies.

- **Call-up Letter (Green Card)** — original and photocopies. Printed from
  the NYSC portal after registration; those who did not subscribe to online
  printing collect it from their institution.
- **Academic credentials** — degree certificate or statement of result.
- **Means of identification** — NIN slip, international passport, or
  driver's license.
- **Medical fitness certificate** from a government hospital.
- **Passport photographs** — white background (bring a full set; camps use
  them for forms and identity cards).
- **Evidence of NHIS registration**, where applicable.

**Foreign-trained graduates:** bring all original documents as uploaded
online, plus the translated version of your certificate where the original
is not in English, and ensure the Verification Officer signs you out before
you leave camp on any grounds.

**Medical graduates:** bring your professional practice license to camp.

Check your details **before** registration — name spelling, date of birth,
course of study, class of degree, and qualification corrections are far
easier to fix before mobilisation than after.

*Last reviewed: 2026-10-20. Verify against the official NYSC portal before
your batch, because requirements are adjusted between batches.*
`,
  },
  {
    slug: 'fees-to-budget-for-camp',
    title: 'What fees to budget for NYSC camp',
    category: 'fees',
    tags: ['camp', 'fees', 'call-up letter', 'budget'],
    sources: [SOURCES.batchb, SOURCES.portal, SOURCES.mob],
    body: `# What fees to budget for NYSC camp

NYSC itself charges very little. Most of your money goes to getting to camp
and living there for three weeks.

## The official portal fee

The online call-up letter printing subscription is **₦3,000**, paid through
the NYSC portal. Only prospective corps members who want their call-up
number by SMS and online printing pay it; those who collect the letter from
their institution do not.

## Registration assistance

If you register at a cyber café rather than yourself, their service charge
is set by the café, not by NYSC. Budget roughly ₦5,000–₦8,000 for the whole
process including the portal fee.

## Cash for camp

Camp life runs largely on cash — food, charging, laundry, photographs.
Bring enough to be comfortable for the full 21 days; ATMs near camps are
unreliable on opening days.

## A warning NYSC itself repeats

Any payment demanded **outside the official portal** should be reported to
NYSC. The Scheme has repeatedly warned prospective corps members about
fraudulent charges, and no camp official should charge you to register.

*Last reviewed: 2026-10-20. Fees change between batches — confirm the
current figures on the official NYSC portal before you pay anything.*
`,
  },
  {
    slug: 'how-to-get-to-your-camp',
    title: 'How to get to your NYSC camp',
    category: 'travel',
    tags: ['camp', 'travel', 'transport', 'reporting'],
    sources: [SOURCES.mob, SOURCES.guide],
    body: `# How to get to your NYSC camp

Your call-up letter names your orientation camp and its state. Every camp
address in Nigeria is listed in the **camp directory** on this site, with
its location pinned to Google Maps.

## Before you travel

- Read your call-up letter for the **reporting window** — camps open on a
  fixed date and registration closes days later. Arrive inside the window;
  late registration creates problems that follow you through the year.
- Confirm the camp is at its permanent site. Some states temporarily
  relocate camps; the directory notes current addresses.

## Getting there

- **From your state of registration**, travel to the camp's state, then to
  the camp itself. Most camps are on the outskirts of the town — ask for
  the NYSC orientation camp, they are locally well known.
- **Shared taxis and buses** run to camp gates on opening days from the
  state capital's major motor parks.
- When you arrive at the gate, camp officials direct you to registration.
  Keep your documents on your person, not packed away in the vehicle.

## On the road

Keep your phone charged and some cash separate from your main pocket.
Travel in the daytime where you can, and keep your documents together in
one folder you never let out of your sight.

*Last reviewed: 2026-10-20. Camp addresses and temporary relocations are
checked against NYSC's own published camps list.*
`,
  },
  {
    slug: 'relocation-how-it-works',
    title: 'NYSC relocation: how it works',
    category: 'relocation',
    tags: ['relocation', 'posting', 'marital', 'health'],
    sources: [SOURCES.mob, SOURCES.faq],
    body: `# NYSC relocation: how it works

Relocation is the process of moving from the state you were posted to,
to another state. It exists for genuine need, is granted on limited
grounds, and is done **electronically** — you apply through the system,
not by finding an office.

## The grounds

- **Marital grounds** — a married female prospective corps member posted
  away from her husband's state of domicile can apply for concessional
  posting during registration, or relocation during camp.
- **Health grounds** — a serious medical condition that the posted state
  cannot manage. You apply with your medical evidence.
- **Security grounds** — in periods of documented insecurity, NYSC has
  relocation windows for affected corps members.

There is **no general relocation** for convenience or preference.

## When you can apply

- **During registration** — concessional posting on marital or health
  grounds, argued through your portal dashboard.
- **During camp** — the camp relocation window. After this window,
  applications are treated as post-camp.
- **After camp** — relocations are then handled roughly **three months**
  after the orientation course ends, through your state secretariat.

## What to know in practice

- Applications are vetted by the Mobilisation Department and the state
  secretariats; approval is never automatic.
- A relocation can also be **cancelled** if the grounds do not hold up.
- Do not relocate yourself informally — your file must move, or you become
  an abscondee, which is a far bigger problem than a posting you dislike.

*Last reviewed: 2026-10-20. Grounds and windows are set by NYSC and change
by batch — check the official mobilisation page for your batch.*
`,
  },
  {
    slug: 'what-to-pack-for-camp',
    title: 'What to pack for NYSC camp',
    category: 'general',
    tags: ['camp', 'packing', 'kit', 'checklist'],
    sources: [SOURCES.guide],
    body: `# What to pack for NYSC camp

Pack light and practical. You carry everything yourself, you will wear
whites most of the day, and camp accommodation is shared.

## The whites

- **White shorts** and **white T-shirts** — several of each. This is the
  daily uniform for drills and activities.
- **White socks** and comfortable **plain shoes** (white where you can;
  what matters is that they survive standing all day).
- A crested cap is usually issued in camp; a plain white cap is a safe
  backup.

## Documents and money

Keep the full document folder from the documents article on your person in
transit, and carry cash for camp — see the fees article.

## Toiletries and personal

- Soap, toothbrush and paste, deodorant, a towel, and sanitary supplies.
- A **bucket and cup** — camp essentials that are also sold nearby.
- Bedding: a blanket or light spread. Mattresses are provided.
- A power bank, a flashlight, and an extension socket if chargers are
  contested in your room.

## Medical

- Any prescription medication you take, with a copy of the prescription.
- Basic first-aid: plasters, pain relief, antimalarials, and
  antihistamines for sensitive skin.

## What not to bring

Anything valuable that you would be upset to lose, heavy appliances, and
more clothing than you can carry in one trip. Camp rooms are shared and
space is a duffel bag, not a wardrobe.

*Last reviewed: 2026-10-20.*
`,
  },
]

async function seedArticles() {
  await dbConnect()

  let created = 0
  for (const seed of articles) {
    // Upsert by slug. Status, publishedAt, reviewedAt are deliberately NOT
    // in the $set — a published article is never silently clobbered by a
    // re-run of this script.
    const existing = await InfoArticle.findOne({ slug: seed.slug })
    if (existing) {
      existing.title = seed.title
      existing.category = seed.category
      existing.body = seed.body
      existing.tags = seed.tags
      existing.sources = seed.sources
      await existing.save()
    } else {
      await InfoArticle.create({
        slug: seed.slug,
        title: seed.title,
        category: seed.category,
        body: seed.body,
        tags: seed.tags,
        sources: seed.sources,
        status: 'draft',
      })
      created++
    }
  }

  const total = await InfoArticle.countDocuments()
  console.log(`[seed-articles] ${articles.length} articles processed`)
  console.log(`[seed-articles] articles in db: ${total} (${created} newly created)`)

  if (total < articles.length) {
    throw new Error(`Expected at least ${articles.length} articles, found ${total}`)
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Set it and re-run.')
    process.exit(1)
  }
  try {
    await seedArticles()
    await mongoose.disconnect()
    process.exit(0)
  } catch (e) {
    console.error('seed failed:', e instanceof Error ? e.message : String(e))
    await mongoose.disconnect()
    process.exit(1)
  }
}

const isMain = process.argv[1]?.endsWith('seed-articles.ts')
if (isMain) {
  main()
}

export { seedArticles }
