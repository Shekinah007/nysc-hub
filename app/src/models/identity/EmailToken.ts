import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * EmailToken — single-use, short-lived tokens for email verification and
 * password reset. Only a SHA-256 hash of the token is stored, so a leaked
 * database cannot be used to hijack accounts.
 */
export type EmailTokenPurpose = 'verify-email' | 'password-reset'

export interface EmailTokenDoc extends Document {
  userId: mongoose.Types.ObjectId
  tokenHash: string
  purpose: EmailTokenPurpose
  /**
   * The address the token was issued to. Not used for lookup — lookups are by
   * hash — but required for per-email rate limiting in the auth actions
   * (SPEC-identity.md §security), so a flood of signup/reset attempts for one
   * address can be throttled.
   */
  targetEmail: string
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const emailTokenSchema = new Schema<EmailTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    purpose: {
      type: String,
      enum: ['verify-email', 'password-reset'],
      required: true,
    },
    targetEmail: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
)

// Lookups are always by hash + purpose; rate-limit counts by email + purpose.
emailTokenSchema.index({ tokenHash: 1, purpose: 1 })
emailTokenSchema.index({ targetEmail: 1, purpose: 1, createdAt: -1 })

export const EmailToken: Model<EmailTokenDoc> =
  mongoose.models.EmailToken ?? model<EmailTokenDoc>('EmailToken', emailTokenSchema)
