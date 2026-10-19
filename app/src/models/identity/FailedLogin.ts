import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * FailedLogin — Mongo-backed login rate-limit counter (SPEC-identity.md).
 *
 * 5 failures for one email within 15 minutes triggers a 10-minute lock.
 * Records expire automatically: the TTL index mirrors the counting window so
 * the collection cannot grow unbounded under an attack.
 */
export interface FailedLoginDoc extends Document {
  email: string
  createdAt: Date
}

const failedLoginSchema = new Schema<FailedLoginDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
  },
  { timestamps: true },
)

// Auto-delete after 15 minutes — the counting window.
failedLoginSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 })

export const FailedLogin: Model<FailedLoginDoc> =
  mongoose.models.FailedLogin ?? model<FailedLoginDoc>('FailedLogin', failedLoginSchema)
