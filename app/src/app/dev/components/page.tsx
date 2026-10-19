import { Button } from '@/components/base/Button'
import { Input } from '@/components/base/Input'
import { Card, CardContent } from '@/components/base/Card'
import { Badge } from '@/components/base/Badge'
import { Alert } from '@/components/base/Alert'
import { Avatar } from '@/components/base/Avatar'

/**
 * Internal component showcase. Verifies the base library renders in a real
 * route. Not for users — excluded from the nav and noindex'd.
 */
export const metadata = {
  title: 'Components — NYSC-Hub (internal)',
  description: 'Base component showcase',
  robots: { index: false, follow: false },
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="mb-6">
      <Card.Header title={title} />
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function ComponentsPage() {
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold">Base components</h1>

      <Section title="Button">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Input">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Email address" type="email" />
          <Input placeholder="Disabled" disabled />
        </div>
      </Section>

      <Section title="Card">
        <Card>
          <Card.Header
            title="Camp announcement"
            description="Posted by the OBS crew"
          />
          <CardContent>
            <p>
              This is the card content area — where announcements, boards, and
              feed items render their bodies.
            </p>
          </CardContent>
          <Card.Footer>
            <Button variant="secondary" size="sm">
              Dismiss
            </Button>
            <Button size="sm">Read</Button>
          </Card.Footer>
        </Card>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">Community-managed</Badge>
          <Badge tone="success">Authorized by camp official</Badge>
          <Badge tone="warning">Claimed by camp crew (unofficial)</Badge>
          <Badge tone="danger">Removed</Badge>
          <Badge tone="info">Trusted</Badge>
        </div>
      </Section>

      <Section title="Alert">
        <div className="grid gap-3">
          <Alert tone="info" title="Information">
            Camp opens on the printed date on your call-up letter.
          </Alert>
          <Alert tone="success" title="Success">
            Your account was verified. Welcome aboard.
          </Alert>
          <Alert tone="warning" title="Caution">
            Reception at camp is limited — download what you need beforehand.
          </Alert>
          <Alert tone="danger" title="Error">
            Something went wrong publishing that announcement.
          </Alert>
        </div>
      </Section>

      <Section title="Avatar">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Shekinah Hope" size="sm" />
          <Avatar name="Ada Obi" size="md" />
          <Avatar name="Bello Kano" size="lg" />
          <Avatar name="OneWordName" size="md" />
        </div>
      </Section>
    </main>
  )
}
