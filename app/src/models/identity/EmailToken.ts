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
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
)

// Lookups are always by hash + purpose.
emailTokenSchema.index({ tokenHash: 1, purpose: 1 })

export const EmailToken: Model<EmailTokenDoc> =
  mongoose.models.EmailToken ?? model<EmailTokenDoc>('EmailToken', emailTokenSchema)
