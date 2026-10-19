import mongoose, { type Document, type Model, Schema, model } from 'mongoose'

/**
 * Session — a database-backed login session.
 *
 * The spec mandates database sessions over JWT (SPEC-identity.md) so that
 * deactivating a user or changing their role can kill live sessions on the
 * next request. Read via `getSessionAndUser` in the Auth.js adapter.
 */
export interface SessionDoc extends Document {
  sessionToken: string
  userId: mongoose.Types.ObjectId
  expires: Date
  createdAt: Date
  updatedAt: Date
}

const sessionSchema = new Schema<SessionDoc>(
  {
    sessionToken: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    expires: { type: Date, required: true },
  },
  { timestamps: true },
)

export const Session: Model<SessionDoc> =
  mongoose.models.Session ?? model<SessionDoc>('Session', sessionSchema)
