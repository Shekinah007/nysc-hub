/**
 * Transactional email.
 *
 * `EmailSender` is the stable interface; the active implementation is chosen
 * here so call sites never depend on a vendor:
 *   - ConsoleSender logs the message (dev, and any environment without a
 *     provider configured).
 *   - A production provider (Resend or equivalent) drops in behind the same
 *     interface once a sending domain is decided — SPEC-identity.md open
 *     question 2.
 *
 * Safety default: in production with no provider configured, sending FAILS
 * LOUDLY rather than silently logging — otherwise verification emails would
 * vanish and registration would look successful while never verifying.
 */
export type EmailMessage = {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>
}

class ConsoleSender implements EmailSender {
  async send(message: EmailMessage) {
    console.log(
      `[email] to: ${message.to}\n[email] subject: ${message.subject}\n[email] body: ${message.text ?? message.html}`,
    )
  }
}

class UnconfiguredSender implements EmailSender {
  async send() {
    throw new Error(
      'No email provider configured for production. Set RESEND_API_KEY ' +
        '(or an equivalent) before allowing signups.',
    )
  }
}

function chooseSender(): EmailSender {
  const isProd = process.env.NODE_ENV === 'production'
  const hasProvider = Boolean(process.env.RESEND_API_KEY)

  if (isProd && !hasProvider) return new UnconfiguredSender()
  // A real provider lands here once configured; until then dev/test logs.
  return new ConsoleSender()
}

export const emailSender: EmailSender = chooseSender()

/** Build the verification link for a token, honoring the configured origin. */
export function verificationUrl(token: string): string {
  const origin =
    process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  return `${origin.replace(/\/$/, '')}/verify-email?token=${token}`
}
